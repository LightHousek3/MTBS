const { News } = require('../models');
const { ApiError } = require('../utils');
const { messages } = require('../constants');

const DUPLICATE_TITLE_MESSAGE = 'Tiêu đề tin tức đã tồn tại';

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ensureUniqueTitle = async (title, ignoreId = null) => {
    const normalizedTitle = title?.trim();
    if (!normalizedTitle) {
        return;
    }

    const query = {
        title: {
            $regex: `^${escapeRegExp(normalizedTitle)}$`,
            $options: 'i',
        },
    };

    if (ignoreId) {
        query._id = { $ne: ignoreId };
    }

    const existingNews = await News.findOne(query);
    if (existingNews) {
        throw ApiError.conflict(DUPLICATE_TITLE_MESSAGE);
    }
};

const createNews = async (body) => {
    await ensureUniqueTitle(body.title);

    try {
        return await News.create(body);
    } catch (error) {
        if (error?.code === 11000) {
            throw ApiError.conflict(DUPLICATE_TITLE_MESSAGE);
        }

        throw error;
    }
};

const getNewsList = async (filter, options) => {
    const queryFilter = {};

    // Text search in title or content
    if (filter.search) {
        queryFilter.$or = [
            { title: { $regex: filter.search, $options: 'i' } },
            { content: { $regex: filter.search, $options: 'i' } }
        ];
    }
    return News.paginate(queryFilter, options);
};

const getNewsById = async (id) => {
    const news = await News.findById(id);
    if (!news) {
        throw ApiError.notFound(messages.CRUD.NOT_FOUND('News'));
    }
    return news;
};

const updateNewsById = async (id, updateBody) => {
    const news = await News.findById(id);
    if (!news) {
        throw ApiError.notFound(messages.CRUD.NOT_FOUND('News'));
    }

    if (updateBody.title) {
        await ensureUniqueTitle(updateBody.title, id);
    }

    Object.assign(news, updateBody);
    news.updatedAt = new Date();

    try {
        return await news.save();
    } catch (error) {
        if (error?.code === 11000) {
            throw ApiError.conflict(DUPLICATE_TITLE_MESSAGE);
        }

        throw error;
    }
};

const deleteNewsById = async (id) => {
    const status = await News.softDeleteById(id);
    return status;
};

module.exports = {
    createNews,
    getNewsList,
    getNewsById,
    updateNewsById,
    deleteNewsById,
};
