const Joi = require('joi');
const { objectId, paginationQuery } = require('./custom.validator');

const createTheater = {
    body: Joi.object().keys({
        name: Joi.string().required().max(100).trim(),
        location: Joi.string().required().max(255).trim(),
        address: Joi.string().required().max(255).trim(),
        phone: Joi.string()
            .required()
            .max(11)
            .pattern(/^[0-9]+$/),
        coordinates: Joi.object().keys({
            type: Joi.string().valid('Point').default('Point'),
            coordinates: Joi.array().ordered(
                Joi.number().min(-180).max(180), // longitude
                Joi.number().min(-90).max(90), // latitude
            ),
        }),
    }),
};

const getTheaters = {
    query: Joi.object().keys({
        ...paginationQuery,
        search: Joi.string().trim().allow(''),
        lat: Joi.number().min(-90).max(90),
        lng: Joi.number().min(-180).max(180),
        maxDistance: Joi.number().integer().min(1).max(150000).default(50000), // meters
    }),
};

const getTheater = {
    params: Joi.object().keys({
        id: Joi.string().required().custom(objectId),
    }),
};

const updateTheater = {
    params: Joi.object().keys({
        id: Joi.string().required().custom(objectId),
    }),
    body: Joi.object()
        .keys({
            name: Joi.string().max(100).trim(),
            location: Joi.string().max(255).trim(),
            address: Joi.string().max(255).trim(),
            phone: Joi.string()
                .max(11)
                .pattern(/^[0-9]+$/),
            coordinates: Joi.object().keys({
                type: Joi.string().valid('Point').default('Point'),
                coordinates: Joi.array().ordered(
                    Joi.number().min(-180).max(180),
                    Joi.number().min(-90).max(90),
                ),
            }),
        })
        .min(1),
};

const deleteTheater = {
    params: Joi.object().keys({
        id: Joi.string().required().custom(objectId),
    }),
};

const updateCoordinates = {
    params: Joi.object().keys({
        id: Joi.string().required().custom(objectId),
    }),
};

module.exports = {
    createTheater,
    getTheaters,
    getTheater,
    updateTheater,
    deleteTheater,
    updateCoordinates,
};
