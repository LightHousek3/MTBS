const { Booking, Showtime, Seat, Service, TicketPrice, Promotion, Payment } = require('../models');
const { ApiError } = require('../utils');
const { messages, BOOKING_STATUS, BOOKING_HOLD_MINUTES, SHOWTIME_STATUS } = require('../constants');
const logger = require('../config/logger');

// ── Helpers ──────────────────────────────────────────────

/**
 * Format time as "HH:MM" from a Date object (Vietnam time UTC+7)
 */
const toVietnamHHMM = (date) => {
    // If the date is already stored as "20:00:00.000Z" representing 20:00 local time,
    // we should extract the hours directly without adding 7 hours to avoid shifting it.
    const hh = String(date.getUTCHours()).padStart(2, '0');
    const mm = String(date.getUTCMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
};

/**
 * Determine day type (WEEKDAY / WEEKEND) from a Date (Vietnam time).
 * Also checks if the date is a public holiday in Vietnam (treated as WEEKEND).
 */
const getDayType = async (dateObj) => {
    // Treat the stored UTC date exactly as the local date
    const day = dateObj.getUTCDay(); // 0=Sun, 6=Sat

    const isWeekend = day === 0 || day === 6;
    if (isWeekend) return 'WEEKEND';

    // Check if public holiday
    const year = dateObj.getUTCFullYear();
    const dateString = dateObj.toISOString().split('T')[0];

    // Simple cache for holiday sets
    global.holidayCache = global.holidayCache || {};

    if (!global.holidayCache[year]) {
        try {
            const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/VN`;
            const response = await fetch(url);
            if (response.ok) {
                const holidays = await response.json();
                global.holidayCache[year] = holidays.map((h) => h.date);
            } else {
                global.holidayCache[year] = [];
            }
        } catch (error) {
            logger.error('Failed to fetch public holidays', error);
            global.holidayCache[year] = [];
        }
    }

    const isHoliday = global.holidayCache[year].includes(dateString);
    return isHoliday ? 'WEEKEND' : 'WEEKDAY';
};

/**
 * Find applicable ticket prices for all requested seat types in one query.
 * Time values use the zero-padded "HH:MM" format, so lexical comparison is safe.
 */
const findTicketPrices = async ({ seatTypes, typeMovie, dayType, showtimeStartHHMM }) => {
    const prices = await TicketPrice.find({
        typeSeat: { $in: seatTypes },
        typeMovie,
        dayType,
        startTime: { $lte: showtimeStartHHMM },
        endTime: { $gt: showtimeStartHHMM },
    })
        .select('typeSeat price')
        .lean();

    return new Map(prices.map((ticketPrice) => [ticketPrice.typeSeat, ticketPrice.price]));
};

/**
 * Apply the current active promotion to the booking (if eligible).
 * Evaluates both ticket and service conditions.
 * Returns the effective discount amount.
 */
const applyActivePromotion = async ({
    seatTypes,
    movieType,
    dayType,
    seatTotal,
    serviceTypes,
    serviceTotal,
}) => {
    const now = new Date();

    // Since overlap logic prevents multiple active promos, we find the single active one
    const promo = await Promotion.findOne({
        status: 'ACTIVE',
        startDate: { $lte: now },
        endDate: { $gte: now },
    });

    if (!promo) return { promotion: null, discount: 0 };

    let eligibleAmount = 0;

    // 1. Check ticket eligibility
    let ticketEligible = false;
    const pt = promo.promotionTickets;
    if (pt && (pt.typeSeat || pt.typeMovie || pt.dayType)) {
        ticketEligible = true;
        if (pt.typeSeat && pt.typeSeat.length > 0) {
            ticketEligible = seatTypes.some((st) => pt.typeSeat.includes(st));
        }
        if (ticketEligible && pt.typeMovie && pt.typeMovie.length > 0) {
            ticketEligible = pt.typeMovie.includes(movieType);
        }
        if (ticketEligible && pt.dayType && pt.dayType.length > 0) {
            ticketEligible = pt.dayType.includes(dayType);
        }
        if (ticketEligible) eligibleAmount += seatTotal;
    }

    // 2. Check service eligibility
    let serviceEligible = false;

    const ps = promo.promotionServices;

    if (ps && ps.typeService?.length && serviceTypes.length) {
        serviceEligible = serviceTypes.some((st) => ps.typeService.includes(st));
    }

    if (serviceEligible) eligibleAmount += serviceTotal;

    if (eligibleAmount === 0) {
        return { promotion: null, discount: 0 };
    }

    let discount = 0;
    if (promo.discountType === 'PERCENT') {
        discount = Math.round((eligibleAmount * promo.discountValue) / 100);
    } else {
        discount = promo.discountValue; // Fixed amount off the eligible total
    }

    discount = Math.min(discount, eligibleAmount);

    return { promotion: promo, discount };
};

/**
 * Check if any booked seats conflict with existing non-expired, non-cancelled bookings
 * for the same showtime.
 */
const checkSeatConflicts = async (showtimeId, seatIds) => {
    const now = new Date();

    const conflict = await Booking.findOne({
        showtime: showtimeId,
        'seats.seat': { $in: seatIds },
        $or: [
            { status: BOOKING_STATUS.CONFIRMED },
            {
                status: BOOKING_STATUS.PENDING,
                expiresAt: { $gt: now },
            },
        ],
    });

    return conflict;
};

/**
 * Build date range filter from optional year input.
 */
const buildYearDateRange = (year) => {
    if (!year) return {};

    const from = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    const to = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0));

    return {
        createdAt: {
            $gte: from,
            $lt: to,
        },
    };
};

// ── Public API ────────────────────────────────────────────

/**
 * Create a booking (customer)
 *
 * @param {string}   userId
 * @param {Object}   body
 * @param {string}   body.showtime       - showtime ID
 * @param {Array}    body.seats          - [{ seatId }]
 * @param {Array}    [body.services]     - [{ serviceId, quantity }]
 * @param {string}   [body.promotionId]  - optional forced promotion ID
 */
const createBooking = async (userId, body) => {
    const { showtime: showtimeId, seats: seatInputs, services: serviceInputs = [] } = body;

    // ── 0. Prevent concurrent pending bookings ───────────
    const existingPending = await Booking.findOne({
        user: userId,
        status: BOOKING_STATUS.PENDING,
        expiresAt: { $gt: new Date() },
    });

    if (existingPending) {
        throw ApiError.badRequest(messages.BOOKING.HAS_PENDING_BOOKING);
    }

    // ── 1. Validate showtime ──────────────────────────────
    const showtime = await Showtime.findById(showtimeId)
        .populate({ path: 'movie', select: 'type title' })
        .populate({ path: 'screen', select: 'theater' });

    if (!showtime) {
        throw ApiError.notFound(messages.CRUD.NOT_FOUND('Showtime'));
    }

    if (showtime.status === SHOWTIME_STATUS.ENDED) {
        throw ApiError.badRequest(messages.BOOKING.SHOWTIME_ENDED);
    }

    if (showtime.startTime <= new Date()) {
        throw ApiError.badRequest(messages.BOOKING.SHOWTIME_NOT_BOOKABLE);
    }

    const theaterId = showtime.screen.theater;
    const movieType = showtime.movie.type; // '2D' | '3D'
    const dayType = await getDayType(showtime.startTime);
    const showtimeStartHHMM = toVietnamHHMM(showtime.startTime);

    // ── 2. Validate seats ─────────────────────────────────
    const seats = await Seat.find({ _id: { $in: seatInputs } });

    if (seats.length !== seatInputs.length) {
        throw ApiError.notFound(messages.CRUD.NOT_FOUND('One or more seats'));
    }

    // All seats must belong to the showtime's screen
    const screenId = String(showtime.screen._id);
    const invalidScreenSeat = seats.find((s) => String(s.screenId) !== screenId);
    if (invalidScreenSeat) {
        throw ApiError.badRequest(messages.BOOKING.SEAT_NOT_IN_SCREEN);
    }

    // All seats must be physically available
    const unavailableSeat = seats.find((s) => s.status !== 'AVAILABLE');
    if (unavailableSeat) {
        throw ApiError.conflict(messages.BOOKING.SEAT_UNAVAILABLE);
    }

    // Check for conflicts from existing bookings (atomic conflict detection)
    const conflict = await checkSeatConflicts(showtimeId, seatInputs);
    if (conflict) {
        throw ApiError.conflict(messages.BOOKING.SEAT_UNAVAILABLE);
    }

    // ── 3. Calculate seat prices ──────────────────────────
    const bookedSeats = [];
    let seatTotal = 0;
    const seatTypes = [...new Set(seats.map((seat) => seat.type))];
    const ticketPriceBySeatType = await findTicketPrices({
        seatTypes,
        typeMovie: movieType,
        dayType,
        showtimeStartHHMM,
    });

    for (const seat of seats) {
        const ticketPrice = ticketPriceBySeatType.get(seat.type);

        if (ticketPrice === undefined) {
            logger.warn(
                `No ticket price for seat ${seat._id} (${seat.type}, ${movieType}, ${dayType}, ${showtimeStartHHMM})`,
            );
            throw ApiError.badRequest(messages.BOOKING.TICKET_PRICE_NOT_FOUND);
        }

        bookedSeats.push({ seat: seat._id, price: ticketPrice });
        seatTotal += ticketPrice;
    }

    // ── 4. Validate services (optional) ──────────────────
    const bookedServices = [];
    let serviceTotal = 0;
    let services;
    if (serviceInputs.length > 0) {
        const serviceIds = serviceInputs.map((s) => s.serviceId);
        services = await Service.find({ _id: { $in: serviceIds } });

        if (services.length !== serviceIds.length) {
            throw ApiError.notFound(messages.CRUD.NOT_FOUND('One or more services'));
        }

        // All services must belong to the showtime's theater
        const badTheaterService = services.find((svc) => String(svc.theater) !== String(theaterId));
        if (badTheaterService) {
            throw ApiError.badRequest(messages.BOOKING.SERVICE_NOT_IN_THEATER);
        }

        // All services must be AVAILABLE
        const unavailableService = services.find((svc) => svc.status !== 'AVAILABLE');
        if (unavailableService) {
            throw ApiError.conflict(messages.BOOKING.SERVICE_NOT_AVAILABLE);
        }

        const serviceMap = new Map(services.map((s) => [String(s._id), s]));

        for (const input of serviceInputs) {
            const svc = serviceMap.get(input.serviceId);
            const total = svc.price * input.quantity;
            bookedServices.push({
                service: svc._id,
                quantity: input.quantity,
                unitPrice: svc.price,
                total,
            });
            serviceTotal += total;
        }
    }

    // ── 5. Apply best promotion ───────────────────────────
    const serviceTypes = [...new Set(services?.map((s) => s.type))];

    const { promotion, discount: promotionDiscount } = await applyActivePromotion({
        seatTypes,
        movieType,
        dayType,
        seatTotal,
        serviceTypes,
        serviceTotal,
    });

    // Total price is already safely adjusted based on discount amount
    // applyActivePromotion correctly restricts discount <= eligible amount
    const totalPrice = Math.max(0, seatTotal + serviceTotal - promotionDiscount);

    // ── 6. Create booking ─────────────────────────────────
    const expiresAt = new Date(Date.now() + BOOKING_HOLD_MINUTES * 60 * 1000);

    const booking = await Booking.create({
        user: userId,
        showtime: showtimeId,
        seats: bookedSeats,
        services: bookedServices,
        totalSeat: seats.length,
        seatTotal,
        serviceTotal,
        promotionDiscount,
        totalPrice,
        status: BOOKING_STATUS.PENDING,
        expiresAt,
    });

    // Populate for response
    return Booking.findById(booking._id)
        .populate({
            path: 'showtime',
            select: 'startTime endTime status movie',
            populate: [
                {
                    path: 'movie',
                    select: 'title type duration image',
                },
                {
                    path: 'screen',
                    select: 'name',
                    populate: {
                        path: 'theater',
                        select: 'name address',
                    },
                },
            ],
        })
        .populate('seats.seat', 'seatNumber type')
        .populate('services.service', 'name type price');
};

module.exports = {
    createBooking,
};
