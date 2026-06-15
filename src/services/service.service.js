const { Service, Theater } = require('../models');
const { ApiError } = require('../utils');
const { messages, SERVICE_STATUS } = require('../constants');

/**
 * Ensure theater exists
 */
const ensureTheaterExists = async (theaterId) => {
    const theater = await Theater.findById(theaterId);
    if (!theater) {
        throw ApiError.notFound(messages.CRUD.NOT_FOUND('Theater'));
    }
    return theater;
};

/**
 * Ensure name is unique within the theater (excluding a given service ID)
 */
const ensureNameUnique = async (theaterId, name, excludeId = null) => {
    const query = { theater: theaterId, name: name.trim() };
    if (excludeId) {
        query._id = { $ne: excludeId };
    }
    const existing = await Service.findOne(query);
    if (existing) {
        throw ApiError.conflict(messages.SERVICE.NAME_THEATER_EXISTS);
    }
};

/**
 * Create a service for a theater
 * name + theater must be unique
 */
const createService = async (body) => {
    await ensureTheaterExists(body.theater);
    await ensureNameUnique(body.theater, body.name);
    return Service.create(body);
};

/**
 * Get services with pagination
 */
const getServices = async (filter, options) => {
    const queryFilter = {};

    if (filter.theater) queryFilter.theater = filter.theater;
    if (filter.type) queryFilter.type = filter.type;
    if (filter.status) queryFilter.status = filter.status;

    if (filter.search) {
        queryFilter.name = { $regex: filter.search, $options: 'i' };
    }

    return Service.paginate(queryFilter, options);
};

/**
 * Get service by ID
 */
const getServiceById = async (id) => {
    const service = await Service.findById(id).populate('theater', 'name');
    if (!service) {
        throw ApiError.notFound(messages.CRUD.NOT_FOUND('Service'));
    }
    return service;
};

/**
 * Update service by ID
 * - Validates name uniqueness within theater on rename
 * - Status transition logic:
 *   AVAILABLE ↔ INACTIVE (admin can toggle)
 *   Once set, can always be changed by admin
 */
const updateServiceById = async (id, updateBody) => {
    const service = await getServiceById(id);

    // If renaming, ensure new name is unique in same theater
    if (updateBody.name && updateBody.name.trim() !== service.name) {
        const theaterId = updateBody.theater || service.theater;
        await ensureNameUnique(theaterId, updateBody.name, id);
    }

    // If theater is being changed, validate new theater exists and check name uniqueness
    if (updateBody.theater && String(updateBody.theater) !== String(service.theater)) {
        await ensureTheaterExists(updateBody.theater);
        const nameToCheck = updateBody.name || service.name;
        await ensureNameUnique(updateBody.theater, nameToCheck, id);
    }

    Object.assign(service, updateBody);
    await service.save();
    return service;
};

/**
 * Update only the status of a service
 */
const updateServiceStatus = async (id, status) => {
    return updateServiceById(id, { status });
};

/**
 * Soft delete a service
 */
const deleteServiceById = async (id) => {
    const service = await getServiceById(id);
    await service.softDelete();
    return service;
};

module.exports = {
    createService,
    getServices,
    getServiceById,
    updateServiceById,
    updateServiceStatus,
    deleteServiceById,
};
