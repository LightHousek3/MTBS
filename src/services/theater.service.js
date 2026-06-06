const { Theater } = require('../models');
const { ApiError } = require('../utils');
const { httpStatus, messages } = require('../constants');

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
    const status = await Theater.softDeleteById(id);
    return status;
};

/**
 * Get all unique locations from theaters
 */
const getLocations = async () => {
    const docs = await Theater.find({
        location: { $exists: true, $ne: '' },
    }).distinct('location');

    return docs;
};

module.exports = {
    createTheater,
    getLocations,
    getTheaters,
    getTheaterById,
    updateTheaterById,
    deleteTheaterById,
};
