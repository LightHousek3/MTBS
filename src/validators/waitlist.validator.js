const Joi = require('joi');
const { objectId, paginationQuery } = require('./custom.validator');

const addMovie = {
    body: Joi.object().keys({
        movieId: Joi.string().required().custom(objectId),
    }),
};

const removeMovie = {
    params: Joi.object().keys({
        movieId: Joi.string().required().custom(objectId),
    }),
};

const getWatchlist = {
    query: Joi.object().keys({
        ...paginationQuery,
        includeReleased: Joi.boolean().default(false),
    }),
};

const getWatchlistStatus = {
    params: Joi.object().keys({
        movieId: Joi.string().required().custom(objectId),
    }),
};

module.exports = {
    addMovie,
    removeMovie,
    getWatchlist,
    getWatchlistStatus,
};
