const Joi = require('joi');
const { objectId, paginationQuery } = require('./custom.validator');
const { SERVICE_TYPE, SERVICE_STATUS } = require('../constants');

const createService = {
    body: Joi.object().keys({
        theater: Joi.string().required().custom(objectId),
        name: Joi.string().required().trim().max(255),
        description: Joi.string().allow('').default(''),
        price: Joi.number().required().min(0),
        type: Joi.string()
            .required()
            .valid(...Object.values(SERVICE_TYPE)),
        status: Joi.string()
            .valid(...Object.values(SERVICE_STATUS))
            .default(SERVICE_STATUS.AVAILABLE),
        imageUrl: Joi.string().uri().allow(null, '').default(null),
        quantity: Joi.number().integer().min(0).default(0),
    }),
};

const getServices = {
    query: Joi.object().keys({
        ...paginationQuery,
        theater: Joi.string().custom(objectId),
        type: Joi.string().valid(...Object.values(SERVICE_TYPE)),
        status: Joi.string().valid(...Object.values(SERVICE_STATUS)),
        search: Joi.string().allow('').trim(),
    }),
};

const getService = {
    params: Joi.object().keys({
        id: Joi.string().required().custom(objectId),
    }),
};

const updateService = {
    params: Joi.object().keys({
        id: Joi.string().required().custom(objectId),
    }),
    body: Joi.object()
        .keys({
            theater: Joi.string().custom(objectId),
            name: Joi.string().trim().max(255),
            description: Joi.string().allow(''),
            price: Joi.number().min(0),
            type: Joi.string().valid(...Object.values(SERVICE_TYPE)),
            status: Joi.string().valid(...Object.values(SERVICE_STATUS)),
            imageUrl: Joi.string().uri().allow(null, ''),
            quantity: Joi.number().integer().min(0),
        })
        .min(1),
};

const updateServiceStatus = {
    params: Joi.object().keys({
        id: Joi.string().required().custom(objectId),
    }),
    body: Joi.object().keys({
        status: Joi.string()
            .required()
            .valid(...Object.values(SERVICE_STATUS)),
    }),
};

const deleteService = {
    params: Joi.object().keys({
        id: Joi.string().required().custom(objectId),
    }),
};

module.exports = {
    createService,
    getServices,
    getService,
    updateService,
    updateServiceStatus,
    deleteService,
};
