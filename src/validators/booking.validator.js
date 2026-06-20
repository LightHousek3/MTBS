const Joi = require('joi');
const { objectId, paginationQuery } = require('./custom.validator');
const { BOOKING_STATUS } = require('../constants');

const createBooking = {
    body: Joi.object().keys({
        showtime: Joi.string().required().custom(objectId),
        seats: Joi.array().items(Joi.string().required().custom(objectId)).min(1).required(),
        services: Joi.array()
            .items(
                Joi.object().keys({
                    serviceId: Joi.string().required().custom(objectId),
                    quantity: Joi.number().integer().min(1).required(),
                }),
            )
            .default([]),
    }),
};

module.exports = {
    createBooking,
};
