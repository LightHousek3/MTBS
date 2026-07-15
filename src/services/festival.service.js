const { Festival } = require('../models');
const { ApiError } = require('../utils');
const { httpStatus, messages } = require('../constants');

const ensureUniqueTitle = async (title, ignoreId = null) => {
    const normalizedTitle = title?.trim();
    if (!normalizedTitle) {
        return;
    }

    const existingFestival = await Festival.findOne({
        title: { $regex: `^${normalizedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
        _id: { $ne: ignoreId },
    });

    if (existingFestival) {
        throw ApiError.conflict('Tiêu đề chương trình đã tồn tại');
    }
};

const createFestival = async (body) => {
    await ensureUniqueTitle(body.title);

    try {
        return await Festival.create(body);
    } catch (error) {
        if (error?.code === 11000) {
            throw ApiError.conflict('Tiêu đề chương trình đã tồn tại');
        }

        throw error;
    }
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

    if (updateBody.title) {
        await ensureUniqueTitle(updateBody.title, id);
    }

    Object.assign(festival, updateBody);
    festival.updatedAt = new Date();

    try {
        return await festival.save();
    } catch (error) {
        if (error?.code === 11000) {
            throw ApiError.conflict('Tiêu đề chương trình đã tồn tại');
        }

        throw error;
    }
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
