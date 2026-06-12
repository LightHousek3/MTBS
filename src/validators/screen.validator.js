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
    body: Joi.object({
        name: Joi.string()
            .trim()
            .min(2)
            .max(100),

        theater: Joi.string()
            .custom(objectId),

        seatCapacity: Joi.number()
            .integer()
            .min(1)
    })
};

// Validate Screen ID
const screenId = {
    params: Joi.object({
        id: Joi.string()
            .custom(objectId)
            .required()
    })
};

module.exports = {
    createScreen,
    updateScreen,
    screenId
};