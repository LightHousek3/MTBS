const Joi = require('joi');

/**
 * Custom Joi validators for reuse across all validator files
 */

/**
 * Validate MongoDB ObjectId
 */
const objectId = (value, helpers) => {
    if (!value.match(/^[0-9a-fA-F]{24}$/)) {
        return helpers.message('"{{#label}}" must be a valid MongoDB ObjectId');
    }
    return value;
};

/**
 * Validate password strength
 * - At least 6 characters
 */
const password = (value, helpers) => {
    if (value.length < 6) {
        return helpers.message('Password must be at least 6 characters');
    }
    return value;
};

/**
 * Validate Vietnamese phone number
 */
const phoneNumber = (value, helpers) => {
    if (!value.match(/^(0[3|5|7|8|9])+([0-9]{8})$/)) {
        return helpers.message('Please provide a valid Vietnamese phone number');
    }
    return value;
};

/**
 * Common pagination query schema
 */
const paginationQuery = {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string(),
    select: Joi.string(),
    populate: Joi.string(),
};

/**
 * Common ID param schema
 */
const idParam = {
    params: Joi.object().keys({
        id: Joi.string().required().custom(objectId),
    }),
};

module.exports = {
    objectId,
    password,
    phoneNumber,
    paginationQuery,
    idParam,
};
