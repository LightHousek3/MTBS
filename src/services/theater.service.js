const { Booking, Screen, Seat, Service, Showtime, Theater } = require('../models');
const { ApiError } = require('../utils');
const { httpStatus, messages } = require('../constants');
const { geocodeAddress } = require('./geocode.service');

/**
 * Create a theater
 */
const createTheater = async (body) => {
    return Theater.create(body);
};

/**
 * Get theaters with pagination and optional geospatial search
 */
const getTheaters = async (filter, options) => {
    const queryFilter = {};

    // Text search
    if (filter.search) {
        queryFilter.$or = [
            { name: { $regex: filter.search, $options: 'i' } },
            { location: { $regex: filter.search, $options: 'i' } },
        ];
    }

    // Geospatial
    if (filter.lat && filter.lng) {
        const maxDistance = filter.maxDistance || 50000; // meters

        // convert meters → radians
        const radius = maxDistance / 6378137;

        queryFilter.coordinates = {
            $geoWithin: {
                $centerSphere: [[Number(filter.lng), Number(filter.lat)], radius],
            },
        };
    }

    return Theater.paginate(queryFilter, options);
};

/**
 * Get theater by ID
 */
const getTheaterById = async (id) => {
    const theater = await Theater.findById(id);
    if (!theater) {
        throw new ApiError(httpStatus.NOT_FOUND, messages.CRUD.NOT_FOUND('Theater'));
    }
    return theater;
};

/**
 * Update theater by ID
 */
const updateTheaterById = async (id, updateBody) => {
    const theater = await Theater.findByIdAndUpdate(id, updateBody, { new: true });
    return theater;
};

/**
 * Soft delete theater
 */
const deleteTheaterById = async (id) => {
    const theater = await getTheaterById(id);
    const screens = await Screen.find({ theater: id }).select('_id').lean();
    const screenIds = screens.map((screen) => screen._id);

    const showtimes = screenIds.length
        ? await Showtime.find({ screen: { $in: screenIds } })
              .select('_id')
              .lean()
        : [];
    const showtimeIds = showtimes.map((showtime) => showtime._id);

    if (showtimeIds.length) {
        const existingBooking = await Booking.findOne({
            showtime: { $in: showtimeIds },
        }).select('_id');

        if (existingBooking) {
            throw ApiError.conflict(messages.THEATER.HAS_BOOKINGS);
        }
    }

    const now = new Date();
    await Promise.all([
        Service.updateMany(
            { theater: id, isDeleted: { $ne: true } },
            { isDeleted: true, deletedAt: now },
        ),
        screenIds.length
            ? Showtime.updateMany(
                  { screen: { $in: screenIds }, isDeleted: { $ne: true } },
                  { isDeleted: true, deletedAt: now },
              )
            : Promise.resolve(),
        screenIds.length
            ? Seat.updateMany(
                  { screenId: { $in: screenIds }, isDeleted: { $ne: true } },
                  { isDeleted: true, deletedAt: now },
              )
            : Promise.resolve(),
        screenIds.length
            ? Screen.updateMany(
                  { _id: { $in: screenIds }, isDeleted: { $ne: true } },
                  { isDeleted: true, deletedAt: now },
              )
            : Promise.resolve(),
    ]);

    await theater.softDelete();
    return true;
};

/**
 * Get all unique locations from theaters
 */
const getLocations = async () => {
    const docs = await Theater.distinct('location', {
        isDeleted: { $ne: true },
    });
    return docs;
};

/**
 * Update theater coordinates by geocoding an address via OpenStreetMap Nominatim.
 * @param {string} id - Theater ID
 * @param {string} [address] - Address to geocode; falls back to theater's existing address
 */
const updateCoordinatesByAddress = async (id) => {
    const theater = await getTheaterById(id);
    const targetAddress = theater.address;

    const { lat, lng } = await geocodeAddress(targetAddress);

    theater.coordinates = {
        type: 'Point',
        coordinates: [lng, lat], // GeoJSON: [longitude, latitude]
    };

    await theater.save();
    return theater;
};

module.exports = {
    createTheater,
    getLocations,
    getTheaters,
    getTheaterById,
    updateTheaterById,
    deleteTheaterById,
    updateCoordinatesByAddress,
};
