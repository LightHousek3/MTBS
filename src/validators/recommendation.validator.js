const Joi = require('joi');

const getMyMovieRecommendations = {
    query: Joi.object().keys({
        limit: Joi.number().integer().min(1).max(50),
    }),
};

module.exports = {
    getMyMovieRecommendations,
};
