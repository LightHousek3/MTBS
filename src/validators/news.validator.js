const Joi = require('joi');

const createNews = {
    body: Joi.object().keys({
        title: Joi.string()
            .required()
            .trim()
            .max(255)
            .messages({
                'any.required': 'Title is required',
                'string.max': 'Title must not exceed 255 characters',
            }),
        content: Joi.string()
            .required()
            .trim()
            .messages({
                'any.required': 'Content is required',
            }),
        image: Joi.string()
            .required()
            .uri()
            .trim()
            .max(255)
            .messages({
                'any.required': 'Image is required',
                'string.uri': 'Image must be a valid URI',
                'string.max': 'Image must not exceed 255 characters',
            }),
    }),
};

const getNews = {
    params: Joi.object().keys({
        id: Joi.string().required().trim(),
    }),
};

const updateNews = {
    params: Joi.object().keys({
        id: Joi.string().required().trim(),
    }),
    body: Joi.object()
        .keys({
            title: Joi.string()
                .trim()
                .max(255)
                .messages({
                    'string.max': 'Title must not exceed 255 characters',
                }),
            content: Joi.string()
                .trim()
                .messages({}),
            image: Joi.string()
                .uri()
                .trim()
                .max(255)
                .messages({
                    'string.uri': 'Image must be a valid URI',
                    'string.max': 'Image must not exceed 255 characters',
                }),
        })
        .min(1)
        .messages({
            'object.min': 'At least one field must be provided for update',
        }),
};

const deleteNews = {
    params: Joi.object().keys({
        id: Joi.string().required().trim(),
    }),
};

const getNewsList = {
    query: Joi.object().keys({
        search: Joi.string().optional().trim(),
        sortBy: Joi.string().optional().trim(),
        limit: Joi.number().integer().min(1).optional(),
        page: Joi.number().integer().min(1).optional(),
    }),
};

module.exports = {
    createNews,
    getNews,
    updateNews,
    deleteNews,
    getNewsList,
};
