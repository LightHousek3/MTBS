const { Booking, Showtime, Seat, Service, Promotion, Payment } = require('../models');
const { ApiError } = require('../utils');
const {
    messages,
    BOOKING_STATUS,
    BOOKING_HOLD_MINUTES,
    SHOWTIME_STATUS,
    SERVICE_STATUS,
} = require('../constants');
const logger = require('../config/logger');
const { findTicketPrices } = require('./helpers/ticketPricing');
const {
    assertServiceStockAvailable,
    reserveServiceQuantities,
    refundBookingServices,
    refundServiceReservations,
} = require('./helpers/serviceStock');

// ── Helpers ──────────────────────────────────────────────

/**
 * Apply the current active promotion to the booking (if eligible).
 * Evaluates both ticket and service conditions.
 * Returns the effective discount amount.
 */
const applyActivePromotion = async ({
    seatAmountsByType,
    movieType,
    dayType,
    serviceAmountsByType,
}) => {
    const now = new Date();

    // Since overlap logic prevents multiple active promos, we find the single active one
    const promo = await Promotion.findOne({
        status: 'ACTIVE',
        startDate: { $lte: now },
        endDate: { $gte: now },
    });

    const noDiscount = {
        promotion: null,
        movieDiscount: 0,
        concessionDiscount: 0,
        eligibleSeatTypes: [],
        eligibleServiceTypes: [],
    };
    if (!promo) return noDiscount;

    const pt = promo.promotionTickets;
    const ps = promo.promotionServices;
    const ticketContextMatches =
        pt &&
        (!pt.typeMovie?.length || pt.typeMovie.includes(movieType)) &&
        (!pt.dayType?.length || pt.dayType.includes(dayType));
    const eligibleSeatTypes = ticketContextMatches
        ? [...seatAmountsByType.keys()].filter(
              (type) => !pt.typeSeat?.length || pt.typeSeat.includes(type),
          )
        : [];
    const eligibleServiceTypes = ps?.typeService?.length
        ? [...serviceAmountsByType.keys()].filter((type) => ps.typeService.includes(type))
        : [];
    const eligibleSeatAmount = eligibleSeatTypes.reduce(
        (total, type) => total + seatAmountsByType.get(type),
        0,
    );
    const eligibleServiceAmount = eligibleServiceTypes.reduce(
        (total, type) => total + serviceAmountsByType.get(type),
        0,
    );
    const eligibleAmount = eligibleSeatAmount + eligibleServiceAmount;

    if (eligibleAmount === 0) {
        return noDiscount;
    }

    let movieDiscount = 0;
    let concessionDiscount = 0;
    if (promo.discountType === 'PERCENT') {
        movieDiscount = Math.min(
            eligibleSeatAmount,
            Math.round((eligibleSeatAmount * promo.discountValue) / 100),
        );
        concessionDiscount = Math.min(
            eligibleServiceAmount,
            Math.round((eligibleServiceAmount * promo.discountValue) / 100),
        );
    } else {
        const discount = Math.min(promo.discountValue, eligibleAmount);
        movieDiscount = Math.min(discount, eligibleSeatAmount);
        concessionDiscount = Math.min(discount - movieDiscount, eligibleServiceAmount);
    }

    return {
        promotion: promo,
        movieDiscount,
        concessionDiscount,
        eligibleSeatTypes,
        eligibleServiceTypes,
    };
};

const applyItemDiscounts = ({ items, totalDiscount, isEligible, amountOf, setFinalAmount }) => {
    const eligibleItems = items.filter(isEligible);
    const eligibleTotal = eligibleItems.reduce((total, item) => total + amountOf(item), 0);
    let allocated = 0;

    for (const item of items) {
        if (!isEligible(item) || eligibleTotal === 0) {
            setFinalAmount(item, amountOf(item));
            continue;
        }

        const isLast = item === eligibleItems.at(-1);
        const discount = isLast
            ? totalDiscount - allocated
            : Math.floor((totalDiscount * amountOf(item)) / eligibleTotal);
        allocated += discount;
        setFinalAmount(item, Math.max(0, amountOf(item) - discount));
    }
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

const bookingPopulate = [
    {
        path: 'user',
        select: 'firstName lastName email phone role',
    },
    {
        path: 'showtime',
        select: 'startTime endTime status movie screen',
        populate: [
            {
                path: 'movie',
                select: 'title type duration image',
            },
            {
                path: 'screen',
                select: 'name theater',
                populate: {
                    path: 'theater',
                    select: 'name address',
                },
            },
        ],
    },
    {
        path: 'seats.seat',
        select: 'seatNumber type status',
    },
    {
        path: 'services.service',
        select: 'name type price',
    },
];

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
    let movieBaseTotal = 0;
    const seatTypes = [...new Set(seats.map((seat) => seat.type))];
    const {
        dayType,
        showtimeStartHHMM,
        priceBySeatType: ticketPriceBySeatType,
    } = await findTicketPrices({
        seatTypes,
        typeMovie: movieType,
        startTime: showtime.startTime,
    });

    for (const seat of seats) {
        const ticketPrice = ticketPriceBySeatType.get(seat.type);

        if (ticketPrice === undefined) {
            logger.warn(
                `No ticket price for seat ${seat._id} (${seat.type}, ${movieType}, ${dayType}, ${showtimeStartHHMM})`,
            );
            throw ApiError.badRequest(messages.BOOKING.TICKET_PRICE_NOT_FOUND);
        }

        bookedSeats.push({ seat: seat._id, price: ticketPrice, type: seat.type });
        movieBaseTotal += ticketPrice;
    }

    // ── 4. Validate services (optional) ──────────────────
    const bookedServices = [];
    let serviceBaseAmount = 0;
    let services;
    let serviceMap = new Map();
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
        const unavailableService = services.find((svc) => svc.status !== SERVICE_STATUS.AVAILABLE);
        if (unavailableService) {
            throw ApiError.conflict(messages.BOOKING.SERVICE_NOT_AVAILABLE);
        }

        serviceMap = new Map(services.map((s) => [String(s._id), s]));
        assertServiceStockAvailable(serviceInputs, serviceMap);

        for (const input of serviceInputs) {
            const svc = serviceMap.get(input.serviceId);
            const total = svc.price * input.quantity;
            bookedServices.push({
                service: svc._id,
                quantity: input.quantity,
                unitPrice: svc.price,
                total,
            });
            serviceBaseAmount += total;
        }
    }

    // ── 5. Apply best promotion ───────────────────────────
    const seatAmountsByType = new Map();
    for (const seat of seats) {
        const price = ticketPriceBySeatType.get(seat.type);
        seatAmountsByType.set(seat.type, (seatAmountsByType.get(seat.type) || 0) + price);
    }
    const serviceAmountsByType = new Map();
    for (const service of bookedServices) {
        const source = services.find((item) => String(item._id) === String(service.service));
        serviceAmountsByType.set(
            source.type,
            (serviceAmountsByType.get(source.type) || 0) + service.total,
        );
        service.type = source.type;
    }

    const { movieDiscount, concessionDiscount, eligibleSeatTypes, eligibleServiceTypes } =
        await applyActivePromotion({
            seatAmountsByType,
            movieType,
            dayType,
            serviceAmountsByType,
        });
    applyItemDiscounts({
        items: bookedSeats,
        totalDiscount: movieDiscount,
        isEligible: (item) => eligibleSeatTypes.includes(item.type),
        amountOf: (item) => item.price,
        setFinalAmount: (item, value) => {
            item.finalPrice = value;
            delete item.type;
        },
    });
    applyItemDiscounts({
        items: bookedServices,
        totalDiscount: concessionDiscount,
        isEligible: (item) => eligibleServiceTypes.includes(item.type),
        amountOf: (item) => item.total,
        setFinalAmount: (item, value) => {
            item.finalTotal = value;
            delete item.type;
        },
    });

    const totalPriceMovie = movieBaseTotal - movieDiscount;
    const totalPriceService = serviceBaseAmount - concessionDiscount;
    const pointsUsed = 0;
    const totalPrice = Math.max(0, totalPriceMovie + totalPriceService - pointsUsed);

    // ── 6. Create booking ─────────────────────────────────
    const expiresAt = new Date(Date.now() + BOOKING_HOLD_MINUTES * 60 * 1000);

    const bookingPayload = {
        user: userId,
        showtime: showtimeId,
        seats: bookedSeats,
        services: bookedServices,
        totalPriceMovie,
        totalPriceService,
        pointsUsed,
        pointsEarned: 0,
        totalPrice,
        status: BOOKING_STATUS.PENDING,
        expiresAt,
    };

    let booking;
    let serviceReservations = [];
    try {
        serviceReservations = await reserveServiceQuantities(serviceInputs, serviceMap);
        booking = await Booking.create(bookingPayload);
    } catch (error) {
        await refundServiceReservations(serviceReservations);
        throw error;
    }

    // Populate for response
    return Booking.findById(booking._id)
        .populate({
            path: 'showtime',
            select: 'startTime endTime status movie screen',
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

const populateBooking = (query) =>
    query
        .populate({
            path: 'showtime',
            select: 'startTime endTime status movie screen',
            populate: [
                { path: 'movie', select: 'title type duration image ageRating' },
                {
                    path: 'screen',
                    select: 'name theater',
                    populate: { path: 'theater', select: 'name address location' },
                },
            ],
        })
        .populate('seats.seat', 'seatNumber type')
        .populate('services.service', 'name type price imageUrl');

const getBookingById = async (bookingId, userId) => {
    const booking = await populateBooking(Booking.findOne({ _id: bookingId, user: userId }));
    if (!booking) throw ApiError.notFound(messages.BOOKING.BOOKING_NOT_FOUND);
    return booking;
};

const getPendingBooking = async (userId) =>
    populateBooking(
        Booking.findOne({
            user: userId,
            status: BOOKING_STATUS.PENDING,
            expiresAt: { $gt: new Date() },
        }).sort({ createdAt: -1 }),
    );

/**
 * List bookings (admin sees all, user sees own).
 */
const getBookings = async (filter, options, requestingUser = null) => {
    const queryFilter = {
        ...buildYearDateRange(filter.year),
    };

    if (filter.status) {
        queryFilter.status = filter.status;
    }

    if (filter.showtime) {
        queryFilter.showtime = filter.showtime;
    }

    if (requestingUser?.role === 'ADMIN') {
        if (filter.user) {
            queryFilter.user = filter.user;
        }
    } else if (requestingUser?.id) {
        queryFilter.user = requestingUser.id;
    }

    return Booking.paginate(queryFilter, {
        ...options,
        populate: options.populate || bookingPopulate,
        sortBy: options.sortBy || 'createdAt:desc',
    });
};

/**
 * Get booking detail (admin or owner).
 */
const getBookingByIdForAdmin = async (bookingId, requestingUser = null) => {
    const booking = await Booking.findById(bookingId).populate(bookingPopulate);

    if (!booking) {
        throw ApiError.notFound(messages.BOOKING.BOOKING_NOT_FOUND);
    }

    if (
        requestingUser &&
        requestingUser.role !== 'ADMIN' &&
        String(booking.user?._id || booking.user) !== String(requestingUser.id)
    ) {
        throw ApiError.forbidden(messages.BOOKING.NOT_OWNER);
    }

    const payments = await Payment.find({ bookingId: booking._id }).sort({ createdAt: -1 });
    const bookingObject = booking.toObject();
    bookingObject.payments = payments;

    return bookingObject;
};

/**
 * Cancel a booking (customer can only cancel PENDING bookings)
 */
const cancelBooking = async (bookingId, userId) => {
    const booking = await Booking.findOneAndUpdate(
        {
            _id: bookingId,
            user: userId,
            status: BOOKING_STATUS.PENDING,
        },
        {
            $set: { status: BOOKING_STATUS.CANCELLED },
            $unset: { expiresAt: '' },
        },
        { new: false },
    );

    if (!booking) {
        const existingBooking = await Booking.findById(bookingId);
        if (!existingBooking) {
            throw ApiError.notFound(messages.BOOKING.BOOKING_NOT_FOUND);
        }
        if (String(existingBooking.user) !== String(userId)) {
            throw ApiError.forbidden(messages.BOOKING.NOT_OWNER);
        }
        throw ApiError.badRequest(messages.BOOKING.CANNOT_CANCEL);
    }

    await refundBookingServices(booking);

    // Cancel associated pending payment (if any)
    await Payment.findOneAndUpdate(
        { bookingId: booking._id, paymentStatus: 'PENDING' },
        { paymentStatus: 'CANCELLED' },
    );

    booking.status = BOOKING_STATUS.CANCELLED;
    booking.expiresAt = undefined;
    return booking;
};

module.exports = {
    createBooking,
    getBookingById,
    getPendingBooking,
    getBookings,
    cancelBooking,
    getBookingByIdForAdmin,
};
