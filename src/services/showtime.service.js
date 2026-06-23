const mongoose = require('mongoose');
const { Showtime, Movie, Screen, Booking, Seat, Promotion } = require('../models');
const { VIETNAM_TIMEZONE_OFFSET_HOURS } = require('../utils');
const { findTicketPrices } = require('./helpers/ticketPricing');

const {
    messages,
    SHOWTIME_BUFFER_MINUTES,
    SHOWTIME_STATUS,
    BOOKING_STATUS,
} = require('../constants');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getObjectIdValue = (value) => (value && value._id ? value._id : value);

const appendAndCondition = (filter, condition) => {
    if (!filter.$and) {
        filter.$and = [];
    }

    filter.$and.push(condition);
};

const applyStatusFilter = (filter, status, now) => {
    if (!status) {
        return;
    }

    if (status === SHOWTIME_STATUS.UPCOMING) {
        appendAndCondition(filter, { startTime: { $gt: now } });
        return;
    }

    if (status === SHOWTIME_STATUS.NOW_SHOWING) {
        appendAndCondition(filter, {
            startTime: { $lte: now },
            endTime: { $gt: now },
        });
        return;
    }

    if (status === SHOWTIME_STATUS.ENDED) {
        appendAndCondition(filter, { endTime: { $lte: now } });
    }
};

const parseDateInput = (value) => {
    if (value instanceof Date) {
        return new Date(value.getTime());
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();

        // Interpret the visual date/time digits as Vietnam local time (UTC+7)
        // regardless of whether the frontend improperly appended a 'Z' or timezone string.
        const matched = trimmed.match(
            /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?/,
        );

        if (matched) {
            const [, year, month, day, hour, minute, second = '0', ms = '0'] = matched;
            const utcMillis = Date.UTC(
                Number(year),
                Number(month) - 1,
                Number(day),
                Number(hour) - VIETNAM_TIMEZONE_OFFSET_HOURS,
                Number(minute),
                Number(second),
                Number(ms.padEnd(3, '0')),
            );

            return new Date(utcMillis);
        }
    }

    return new Date(value);
};

const getVietnamDateRange = (date) => {
    const parsedDate = date instanceof Date ? date : new Date(date);
    const startOfDay = new Date(
        Date.UTC(
            parsedDate.getUTCFullYear(),
            parsedDate.getUTCMonth(),
            parsedDate.getUTCDate(),
            -VIETNAM_TIMEZONE_OFFSET_HOURS,
            0,
            0,
            0,
        ),
    );

    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    return { startOfDay, endOfDay };
};

const ensureValidTimeRange = ({ startTime, endTime }) => {
    const normalizedStart = parseDateInput(startTime);
    const normalizedEnd = parseDateInput(endTime);

    if (
        Number.isNaN(normalizedStart.getTime()) ||
        Number.isNaN(normalizedEnd.getTime()) ||
        !(normalizedStart < normalizedEnd)
    ) {
        throw ApiError.badRequest(messages.VALIDATION.INVALID_TIME_RANGE);
    }

    return { normalizedStart, normalizedEnd };
};

const ensureShowtimeStartIsNotInPast = (startTime) => {
    if (startTime < new Date()) {
        throw ApiError.badRequest(messages.VALIDATION.SHOWTIME_START_TIME_IN_PAST);
    }
};

const ensureShowtimeInMovieWindow = ({ movieDoc, startTime, endTime }) => {
    if (!movieDoc?.releaseDate || !movieDoc?.endDate) {
        throw ApiError.badRequest(messages.VALIDATION.MOVIE_SCHEDULE_NOT_CONFIGURED);
    }

    const movieStart = new Date(movieDoc.releaseDate);
    const movieEnd = new Date(movieDoc.endDate);

    // Inclusive boundaries: showtime is valid when it does not exceed movie window.
    if (startTime < movieStart || endTime > movieEnd) {
        throw ApiError.badRequest(messages.VALIDATION.SHOWTIME_OUTSIDE_MOVIE_RANGE);
    }
};

const ensureShowtimeDurationMatchesMovie = ({ movieDoc, startTime, endTime }) => {
    const movieDurationMinutes = Number(movieDoc?.duration);
    if (!Number.isFinite(movieDurationMinutes) || movieDurationMinutes <= 0) {
        throw ApiError.badRequest(messages.VALIDATION.MOVIE_DURATION_NOT_CONFIGURED);
    }

    const showtimeDurationMinutes = (endTime.getTime() - startTime.getTime()) / (60 * 1000);
    if (showtimeDurationMinutes < movieDurationMinutes) {
        throw ApiError.badRequest(
            messages.VALIDATION.SHOWTIME_SHORTER_THAN_MOVIE_DURATION(movieDurationMinutes),
        );
    }
};

const ensureNoOverlappingShowtimeInScreen = async ({
    screen,
    startTime,
    endTime,
    excludeShowtimeId,
}) => {
    // Add buffer time (in milliseconds) to prevent showtimes from being too close
    const bufferMs = SHOWTIME_BUFFER_MINUTES * 60 * 1000;

    const overlapQuery = {
        screen: getObjectIdValue(screen),
        // Check if any showtime overlaps with [startTime - buffer, endTime + buffer]
        endTime: { $gt: new Date(startTime.getTime() - bufferMs) },
        startTime: { $lt: new Date(endTime.getTime() + bufferMs) },
    };

    if (excludeShowtimeId) {
        overlapQuery._id = { $ne: excludeShowtimeId };
    }

    const overlappedShowtime = await Showtime.findOne(overlapQuery);
    if (overlappedShowtime) {
        throw ApiError.conflict(
            messages.VALIDATION.SHOWTIME_OVERLAP_IN_SCREEN(SHOWTIME_BUFFER_MINUTES),
        );
    }
};

const ensureShowtimeHasNoActiveBookings = async (showtimeId) => {
    const activeBooking = await Booking.findOne({
        showtime: showtimeId,
        status: {
            $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED],
        },
    }).select('_id');

    if (activeBooking) {
        throw ApiError.conflict(messages.VALIDATION.SHOWTIME_HAS_ACTIVE_BOOKINGS);
    }
};

const ensureMovieAndScreenExist = async ({ movie, screen }) => {
    let movieDoc;
    let screenDoc;

    if (movie) {
        movieDoc = await Movie.findById(movie);
        if (!movieDoc) {
            throw ApiError.notFound(messages.CRUD.NOT_FOUND('Movie'));
        }
    }

    if (screen) {
        screenDoc = await Screen.findById(screen);
        if (!screenDoc) {
            throw ApiError.notFound(messages.CRUD.NOT_FOUND('Screen'));
        }
    }

    return { movieDoc, screenDoc };
};

const createShowtime = async (body) => {
    const { movieDoc } = await ensureMovieAndScreenExist({
        movie: body.movie,
        screen: body.screen,
    });

    const { normalizedStart, normalizedEnd } = ensureValidTimeRange({
        startTime: body.startTime,
        endTime: body.endTime,
    });

    ensureShowtimeStartIsNotInPast(normalizedStart);

    ensureShowtimeInMovieWindow({
        movieDoc,
        startTime: normalizedStart,
        endTime: normalizedEnd,
    });

    ensureShowtimeDurationMatchesMovie({
        movieDoc,
        startTime: normalizedStart,
        endTime: normalizedEnd,
    });

    await ensureNoOverlappingShowtimeInScreen({
        screen: body.screen,
        startTime: normalizedStart,
        endTime: normalizedEnd,
    });

    const existing = await Showtime.findOne({
        screen: body.screen,
        movie: body.movie,
        startTime: normalizedStart,
        endTime: normalizedEnd,
    });
    if (existing) {
        throw ApiError.conflict(messages.CRUD.ALREADY_EXISTS('Showtime'));
    }
    return Showtime.create({
        ...body,
        startTime: normalizedStart,
        endTime: normalizedEnd,
    });
};

const getShowtimes = async (filter, options) => {
    const normalizedFilter = { ...filter };
    const normalizedOptions = { ...options };
    const location = normalizedFilter.location?.trim();
    const theaterId = normalizedFilter.theaterId || normalizedFilter.theater;
    const date = normalizedFilter.date;
    const status = normalizedFilter.status;
    const now = new Date();

    delete normalizedFilter.location;
    delete normalizedFilter.theaterId;
    delete normalizedFilter.theater;
    delete normalizedFilter.date;
    delete normalizedFilter.status;

    if (theaterId && !normalizedOptions.populate) {
        normalizedOptions.populate = 'movie,screen.theater';
    }

    applyStatusFilter(normalizedFilter, status, now);

    const populateFields = normalizedOptions.populate
        ? normalizedOptions.populate.split(',').map((field) => field.trim())
        : [];
    const shouldPopulateMovie =
        populateFields.includes('movie') || populateFields.includes('movie.genres');
    const shouldPopulateMovieGenres =
        shouldPopulateMovie || populateFields.includes('movie.genres');
    const shouldPopulateScreen =
        populateFields.includes('screen') || populateFields.includes('screen.theater');
    const shouldPopulateScreenTheater = populateFields.includes('screen.theater');

    if (date) {
        const { startOfDay, endOfDay } = getVietnamDateRange(date);

        normalizedFilter.startTime = {
            ...(typeof normalizedFilter.startTime === 'object' && normalizedFilter.startTime
                ? normalizedFilter.startTime
                : {}),
            $gte: startOfDay,
            $lt: endOfDay,
        };
    }

    if (!location) {
        if (theaterId) {
            const screens = await Screen.find({ theater: theaterId }).select('_id').lean();
            normalizedFilter.screen = { $in: screens.map((screen) => screen._id) };
        }

        const result = await Showtime.paginate(normalizedFilter, normalizedOptions);

        // Ensure movie.genres is populated with id and name when movie is requested.
        if (shouldPopulateMovieGenres) {
            await Showtime.populate(result.results, {
                path: 'movie.genres',
                select: 'name',
            });
        }

        return result;
    }

    let sort = { createdAt: -1 };
    if (normalizedOptions.sortBy) {
        sort = {};
        normalizedOptions.sortBy.split(',').forEach((sortOption) => {
            const [key, order] = sortOption.split(':');
            sort[key] = order === 'desc' ? -1 : 1;
        });
    }

    const limit = Math.min(Math.max(parseInt(normalizedOptions.limit, 10) || 10, 1), 100);
    const page = Math.max(parseInt(normalizedOptions.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const aggregationPipeline = [
        { $match: normalizedFilter },
        {
            $lookup: {
                from: 'screens',
                localField: 'screen',
                foreignField: '_id',
                as: '_screen',
            },
        },
        { $unwind: '$_screen' },
        // If a theater id filter is provided, match directly against the screen's theater field
        ...(theaterId
            ? [
                  {
                      $match: {
                          '_screen.theater': new mongoose.Types.ObjectId(theaterId),
                      },
                  },
              ]
            : []),
        {
            $lookup: {
                from: 'theaters',
                localField: '_screen.theater',
                foreignField: '_id',
                as: '_theater',
            },
        },
        { $unwind: '$_theater' },
        {
            $match: {
                '_theater.location': {
                    $regex: escapeRegex(location),
                    $options: 'i',
                },
            },
        },
    ];

    if (theaterId) {
        aggregationPipeline.push({
            $match: {
                '_theater._id': new mongoose.Types.ObjectId(theaterId),
            },
        });
    }

    if (shouldPopulateMovie) {
        aggregationPipeline.push(
            {
                $lookup: {
                    from: 'movies',
                    localField: 'movie',
                    foreignField: '_id',
                    as: 'movie',
                },
            },
            {
                $unwind: {
                    path: '$movie',
                    preserveNullAndEmptyArrays: true,
                },
            },
        );

        if (shouldPopulateMovieGenres) {
            aggregationPipeline.push({
                $lookup: {
                    from: 'genres',
                    let: { genreIds: '$movie.genres' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $in: ['$_id', '$$genreIds'],
                                },
                            },
                        },
                        {
                            $project: {
                                _id: 0,
                                id: { $toString: '$_id' },
                                name: 1,
                            },
                        },
                    ],
                    as: '_movieGenres',
                },
            });
        }
    }

    aggregationPipeline.push(
        {
            $addFields: {
                status: {
                    $switch: {
                        branches: [
                            {
                                case: { $lte: ['$endTime', now] },
                                then: SHOWTIME_STATUS.ENDED,
                            },
                            {
                                case: { $gt: ['$startTime', now] },
                                then: SHOWTIME_STATUS.UPCOMING,
                            },
                        ],
                        default: SHOWTIME_STATUS.NOW_SHOWING,
                    },
                },
            },
        },
        {
            $project: {
                _id: 1,
                status: 1,
                startTime: 1,
                endTime: 1,
                movie: shouldPopulateMovie
                    ? shouldPopulateMovieGenres
                        ? {
                              $mergeObjects: ['$movie', { genres: '$_movieGenres' }],
                          }
                        : '$movie'
                    : '$movie',
                screen: shouldPopulateScreen
                    ? shouldPopulateScreenTheater
                        ? { $mergeObjects: ['$_screen', { theater: '$_theater' }] }
                        : '$_screen'
                    : '$screen',
                createdAt: 1,
                updatedAt: 1,
            },
        },
        { $sort: sort },
        {
            $facet: {
                results: [{ $skip: skip }, { $limit: limit }],
                totalCount: [{ $count: 'count' }],
            },
        },
    );

    const [aggregated] = await Showtime.aggregate(aggregationPipeline);
    const totalResults = aggregated.totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalResults / limit);

    return {
        results: aggregated.results,
        meta: {
            page,
            limit,
            totalResults,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        },
    };
};

const getShowtimeById = async (id, options = {}) => {
    const populateFields = options.populate
        ? options.populate.split(',').map((field) => field.trim())
        : [];
    const shouldPopulateMovie =
        populateFields.includes('movie') || populateFields.includes('movie.genres');
    const shouldPopulateMovieGenres = populateFields.includes('movie.genres');
    const shouldPopulateScreen =
        populateFields.includes('screen') || populateFields.includes('screen.theater');
    const shouldPopulateScreenTheater = populateFields.includes('screen.theater');

    let query = Showtime.findById(id);

    if (shouldPopulateMovie) {
        query = query.populate({
            path: 'movie',
            ...(shouldPopulateMovieGenres
                ? {
                      populate: {
                          path: 'genres',
                          select: 'name',
                      },
                  }
                : {}),
        });
    }

    if (shouldPopulateScreen) {
        query = query.populate({
            path: 'screen',
            ...(shouldPopulateScreenTheater ? { populate: { path: 'theater' } } : {}),
        });
    }

    const showtime = await query;
    if (!showtime) {
        throw ApiError.notFound(messages.CRUD.NOT_FOUND('Showtime'));
    }
    return showtime;
};

const updateShowtimeById = async (id, updateBody) => {
    const showtime = await getShowtimeById(id);

    await ensureShowtimeHasNoActiveBookings(showtime._id);

    const { movieDoc } = await ensureMovieAndScreenExist({
        movie: updateBody.movie,
        screen: updateBody.screen,
    });

    const effectiveMovieDoc = movieDoc || (await Movie.findById(showtime.movie));
    if (!effectiveMovieDoc) {
        throw ApiError.notFound(messages.CRUD.NOT_FOUND('Movie'));
    }
    const effectiveScreen = updateBody.screen || showtime.screen;
    const { normalizedStart, normalizedEnd } = ensureValidTimeRange({
        startTime: updateBody.startTime || showtime.startTime,
        endTime: updateBody.endTime || showtime.endTime,
    });

    if (updateBody.startTime !== undefined) {
        ensureShowtimeStartIsNotInPast(normalizedStart);
    }

    ensureShowtimeInMovieWindow({
        movieDoc: effectiveMovieDoc,
        startTime: normalizedStart,
        endTime: normalizedEnd,
    });

    ensureShowtimeDurationMatchesMovie({
        movieDoc: effectiveMovieDoc,
        startTime: normalizedStart,
        endTime: normalizedEnd,
    });

    await ensureNoOverlappingShowtimeInScreen({
        screen: effectiveScreen,
        startTime: normalizedStart,
        endTime: normalizedEnd,
        excludeShowtimeId: showtime._id,
    });

    if (updateBody.startTime !== undefined) {
        updateBody.startTime = normalizedStart;
    }

    if (updateBody.endTime !== undefined) {
        updateBody.endTime = normalizedEnd;
    }

    Object.assign(showtime, updateBody);
    await showtime.save();
    return showtime;
};

const deleteShowtimeById = async (id) => {
    const showtime = await getShowtimeById(id);

    await ensureShowtimeHasNoActiveBookings(showtime._id);

    await showtime.softDelete();
    return showtime;
};

const extractBookedSeatIds = (bookings) => {
    const bookedSeatIds = new Set();

    for (const booking of bookings) {
        for (const seatBooking of booking.seats || []) {
            bookedSeatIds.add(String(seatBooking.seat));
        }
    }

    return bookedSeatIds;
};

const calculateSeatPrice = ({ seatType, movieType, dayType, basePrice, promotion }) => {
    if (!promotion || basePrice <= 0) {
        return {
            finalPrice: basePrice,
            discount: 0,
            promotionEligible: false,
        };
    }

    const pt = promotion.promotionTickets || {};

    const matchesSeat = !pt.typeSeat?.length || pt.typeSeat.includes(seatType);

    const matchesMovie = !pt.typeMovie?.length || pt.typeMovie.includes(movieType);

    const matchesDay = !pt.dayType?.length || pt.dayType.includes(dayType);

    const isEligible = matchesSeat && matchesMovie && matchesDay;

    if (!isEligible) {
        return {
            finalPrice: basePrice,
            discount: 0,
            promotionEligible: false,
        };
    }

    let discount = 0;

    if (promotion.discountType === 'PERCENT') {
        discount = Math.round((basePrice * promotion.discountValue) / 100);
    }

    discount = Math.min(discount, basePrice);

    return {
        discount,
        finalPrice: basePrice - discount,
        promotionEligible: true,
    };
};

const getShowtimeSeating = async (id) => {
    const showtime = await Showtime.findById(id)
        .populate({
            path: 'screen',
            populate: { path: 'theater' },
        })
        .populate('movie')
        .lean({ virtuals: true });

    if (!showtime) {
        throw ApiError.notFound(messages.CRUD.NOT_FOUND('Showtime'));
    }

    const { screen, movie, startTime } = showtime;

    const now = new Date();
    const [seats, bookings, promotion] = await Promise.all([
        Seat.find({ screenId: screen._id }).lean(),
        Booking.find({
            showtime: id,
            $or: [
                { status: BOOKING_STATUS.CONFIRMED },
                { status: BOOKING_STATUS.PENDING, expiresAt: { $gt: now } },
            ],
        })
            .select('seats')
            .lean(),
        Promotion.findOne({
            startDate: { $lte: now },
            endDate: { $gte: now },
            status: 'ACTIVE',
        }).lean(),
    ]);

    const seatTypes = [...new Set(seats.map((seat) => seat.type))];
    const { dayType, priceBySeatType } = await findTicketPrices({
        seatTypes,
        typeMovie: movie.type,
        startTime: startTime,
    });
    const missingPriceType = seatTypes.find((seatType) => !priceBySeatType.has(seatType));
    if (missingPriceType) {
        throw ApiError.badRequest(messages.BOOKING.TICKET_PRICE_NOT_FOUND);
    }

    const bookedSeatIds = extractBookedSeatIds(bookings);

    const structuredSeats = seats.map((seat) => {
        const basePrice = priceBySeatType.get(seat.type) ?? 0;

        const { finalPrice, discount, promotionEligible } = calculateSeatPrice({
            seatType: seat.type,
            movieType: movie.type,
            dayType,
            basePrice,
            promotion,
        });

        return {
            _id: seat._id,
            seatNumber: seat.seatNumber,
            type: seat.type,
            status:
                bookedSeatIds.has(String(seat._id)) || seat.status === 'UNAVAILABLE'
                    ? 'UNAVAILABLE'
                    : 'AVAILABLE',
            basePrice,
            price: finalPrice,
            discount,
            promotionEligible,
        };
    });

    return {
        showtime: {
            _id: showtime._id,
            startTime: showtime.startTime,
        },
        movie: {
            _id: movie._id,
            title: movie.title,
            type: movie.type,
            image: movie.image,
        },
        theater: screen.theater
            ? {
                  _id: screen.theater._id,
                  name: screen.theater.name,
                  address: screen.theater.address,
              }
            : null,
        screen: {
            _id: screen._id,
            name: screen.name,
        },
        seats: structuredSeats,
        promotion: promotion
            ? {
                  id: String(promotion._id),
                  discountType: promotion.discountType,
                  discountValue: promotion.discountValue,
              }
            : null,
    };
};

module.exports = {
    createShowtime,
    getShowtimes,
    getShowtimeById,
    updateShowtimeById,
    deleteShowtimeById,
    getShowtimeSeating,
};
