const { Screen, Theater } = require('../models');
const { ApiError } = require('../utils');
const { httpStatus, messages } = require('../constants');

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const createScreen = async (body) => {
    // Check if screen with same name exists for the same theater
    const existing = await Screen.findOne({
        name: body.name,
        theater: body.theater
    });
    
    if (existing) {
        throw ApiError.conflict(messages.CRUD.ALREADY_EXISTS('Screen with this name in this theater'));
    }
    
    return Screen.create(body);
};

const getScreenList = async (filter, options = {}) => {
    const queryFilter = {};

    // Filter by theater
    if (filter.theater) {
        queryFilter.theater = filter.theater;
    }

    // Text search in screen name or related theater info.
    if (filter.search) {
        const searchRegex = { $regex: escapeRegExp(filter.search.trim()), $options: 'i' };
        const theaters = await Theater.find({
            $or: [
                { name: searchRegex },
                { address: searchRegex },
                { location: searchRegex },
            ],
        }).select('_id');

        queryFilter.$or = [
            { name: searchRegex },
            { theater: { $in: theaters.map((theater) => theater._id) } },
        ];
    }

    return Screen.paginate(queryFilter, {
        ...options,
        populate: options.populate || 'theater:name-address',
    });
};

const getScreenById = async (id) => {
    const screen = await Screen.findById(id).populate('theater');
    if (!screen) {
        throw ApiError.notFound(messages.CRUD.NOT_FOUND('Screen'));
    }
    return screen;
};

const updateScreenById = async (id, updateBody) => {
    const screen = await Screen.findById(id);
    if (!screen) {
        throw ApiError.notFound(messages.CRUD.NOT_FOUND('Screen'));
    }

    // Check if name is being updated and already exists for the same theater
    if (updateBody.name && updateBody.name !== screen.name) {
        const existing = await Screen.findOne({
            name: updateBody.name,
            theater: screen.theater
        });
        if (existing) {
            throw ApiError.conflict(messages.CRUD.ALREADY_EXISTS('Screen with this name in this theater'));
        }
    }

    Object.assign(screen, updateBody);
    screen.updatedAt = new Date();
    return screen.save();
};

const deleteScreenById = async (id) => {
    const status = await Screen.softDeleteById(id);
    return status;
};

module.exports = {
    createScreen,
    getScreenList,
    getScreenById,
    updateScreenById,
    deleteScreenById,
};
