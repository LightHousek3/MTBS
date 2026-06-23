const { News } = require('../models');
const { ApiError } = require('../utils');
const { httpStatus, messages } = require('../constants');

const createNews = async (body) => {
    return News.create(body);
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

    Object.assign(news, updateBody);
    news.updatedAt = new Date();
    return news.save();
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
