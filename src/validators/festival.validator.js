const Joi = require('joi');

const createFestival = {
    body: Joi.object().keys({
        title: Joi.string()
            .required()
            .trim()
            .max(255)
            .messages({
                'any.required': 'Title is required',
                'string.max': 'Title must not exceed 255 characters',
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
        content: Joi.string()
            .required()
            .trim()
            .messages({
                'any.required': 'Content is required',
            }),
        startTime: Joi.date()
            .required()
            .messages({
                'any.required': 'Start time is required',
                'date.base': 'Start time must be a valid date',
            }),
        endTime: Joi.date()
            .required()
            .greater(Joi.ref('startTime'))
            .messages({
                'any.required': 'End time is required',
                'date.base': 'End time must be a valid date',
                'date.greater': 'End time must be after start time',
            }),
    }),
};

const getFestival = {
    params: Joi.object().keys({
        id: Joi.string().required().trim(),
    }),
};

const updateFestival = {
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
            image: Joi.string()
                .uri()
                .trim()
                .max(255)
                .messages({
                    'string.uri': 'Image must be a valid URI',
                    'string.max': 'Image must not exceed 255 characters',
                }),
            content: Joi.string()
                .trim()
                .messages({}),
            startTime: Joi.date()
                .messages({
                    'date.base': 'Start time must be a valid date',
                }),
            endTime: Joi.date()
                .greater(Joi.ref('startTime'))
                .messages({
                    'date.base': 'End time must be a valid date',
                    'date.greater': 'End time must be after start time',
                }),
        })
        .min(1)
        .messages({
            'object.min': 'At least one field must be provided for update',
        }),
};

const deleteFestival = {
    params: Joi.object().keys({
        id: Joi.string().required().trim(),
    }),
};

const getFestivalList = {
    query: Joi.object().keys({
        search: Joi.string().optional().trim(),
        sortBy: Joi.string().optional().trim(),
        limit: Joi.number().integer().min(1).optional(),
        page: Joi.number().integer().min(1).optional(),
    }),
};

module.exports = {
    createFestival,
    getFestival,
    updateFestival,
    deleteFestival,
    getFestivalList,
};
