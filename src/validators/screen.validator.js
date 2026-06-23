const Joi = require("joi");
const mongoose = require("mongoose");

// validate ObjectId
const objectId = (value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.message("Invalid ObjectId");
    }
    return value;
};

// Create Screen
const createScreen = {
    body: Joi.object({
        name: Joi.string()
            .trim()
            .min(2)
            .max(100)
            .required()
            .messages({
                "string.empty": "Screen name cannot be empty",
                "any.required": "Screen name is required",
                "string.min": "Screen name must be at least 2 characters",
                "string.max": "Screen name must be at most 100 characters"
            }),

        theater: Joi.string()
            .custom(objectId)
            .required()
            .messages({
                "any.required": "Theater is required"
            }),

        seatCapacity: Joi.number()
            .integer()
            .min(1)
            .required()
            .messages({
                "number.base": "Seat capacity must be a number",
                "number.min": "Seat capacity must be greater than 0"
            })
    })
};

// Update Screen
const updateScreen = {
    params: Joi.object({
        id: Joi.string()
            .custom(objectId)
            .required()
    }),
    body: Joi.object({
        name: Joi.string()
            .trim()
            .min(2)
            .max(100)
            .messages({
                "string.min": "Screen name must be at least 2 characters",
                "string.max": "Screen name must be at most 100 characters"
            }),

        theater: Joi.string()
            .custom(objectId),

        seatCapacity: Joi.number()
            .integer()
            .min(1)
            .messages({
                "number.base": "Seat capacity must be a number",
                "number.min": "Seat capacity must be greater than 0"
            })
    }).min(1)
};

// Get Screen
const getScreen = {
    params: Joi.object({
        id: Joi.string()
            .custom(objectId)
            .required()
    })
};

// Get Screen List
const getScreenList = {
    query: Joi.object().keys({
        theater: Joi.string().custom(objectId).optional(),
        search: Joi.string().optional().trim(),
        sortBy: Joi.string().optional().trim(),
        limit: Joi.number().integer().min(1).optional(),
        page: Joi.number().integer().min(1).optional(),
    }),
};

// Delete Screen
const deleteScreen = {
    params: Joi.object({
        id: Joi.string()
            .custom(objectId)
            .required()
    })
};

module.exports = {
    createScreen,
    updateScreen,
    getScreen,
    getScreenList,
    deleteScreen
};