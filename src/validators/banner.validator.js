const Joi = require('joi');
const { BANNER_TYPE } = require('../constants');

const createBanner = {
    body: Joi.object().keys({
        type: Joi.string()
            .required()
            .valid(...Object.values(BANNER_TYPE))
            .messages({
                'any.required': 'Type is required',
                'any.only': `Type must be one of: ${Object.values(BANNER_TYPE).join(', ')}`,
            }),
        url: Joi.string()
            .required()
            .uri()
            .trim()
            .max(2048)
            .messages({
                'any.required': 'URL is required',
                'string.uri': 'URL must be a valid URI',
                'string.max': 'URL must not exceed 2048 characters',
            }),
    }),
};

const getBanner = {
    params: Joi.object().keys({
        id: Joi.string().required().trim(),
    }),
};

const updateBanner = {
    params: Joi.object().keys({
        id: Joi.string().required().trim(),
    }),
    body: Joi.object()
        .keys({
            type: Joi.string()
                .valid(...Object.values(BANNER_TYPE))
                .messages({
                    'any.only': `Type must be one of: ${Object.values(BANNER_TYPE).join(', ')}`,
                }),
            url: Joi.string()
                .uri()
                .trim()
                .max(2048)
                .messages({
                    'string.uri': 'URL must be a valid URI',
                    'string.max': 'URL must not exceed 2048 characters',
                }),
        })
        .min(1)
        .messages({
            'object.min': 'At least one field must be provided for update',
        }),
};

const deleteBanner = {
    params: Joi.object().keys({
        id: Joi.string().required().trim(),
    }),
};

const getBanners = {
    query: Joi.object().keys({
        type: Joi.string()
            .valid(...Object.values(BANNER_TYPE))
            .optional(),
        createdAt: Joi.date().optional(),
        sortBy: Joi.string().optional().trim(),
        limit: Joi.number().integer().min(1).optional(),
        page: Joi.number().integer().min(1).optional(),
    }),
};

module.exports = {
    createBanner,
    getBanner,
    updateBanner,
    deleteBanner,
    getBanners,
};
