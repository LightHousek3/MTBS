const { Festival } = require('../models');
const { ApiError } = require('../utils');
const { httpStatus, messages } = require('../constants');

const createFestival = async (body) => {
    return Festival.create(body);
};

const getFestivalList = async (filter, options) => {
    const queryFilter = {};

    // Text search in title or content
    if (filter.search) {
        queryFilter.$or = [
            { title: { $regex: filter.search, $options: 'i' } },
            { content: { $regex: filter.search, $options: 'i' } }
        ];
    }
    return Festival.paginate(queryFilter, options);
};

const getFestivalById = async (id) => {
    const festival = await Festival.findById(id);
    if (!festival) {
        throw ApiError.notFound(messages.CRUD.NOT_FOUND('Festival'));
    }
    return festival;
};

const updateFestivalById = async (id, updateBody) => {
    const festival = await Festival.findById(id);
    if (!festival) {
        throw ApiError.notFound(messages.CRUD.NOT_FOUND('Festival'));
    }

    Object.assign(festival, updateBody);
    festival.updatedAt = new Date();
    return festival.save();
};

const deleteFestivalById = async (id) => {
    const status = await Festival.softDeleteById(id);
    return status;
};

module.exports = {
    createFestival,
    getFestivalList,
    getFestivalById,
    updateFestivalById,
    deleteFestivalById,
};
