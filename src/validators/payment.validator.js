const Joi = require('joi');
const { objectId } = require('./custom.validator');

const initiateVnpay = {
    body: Joi.object().keys({
        bookingId: Joi.string().required().custom(objectId),
    }),
};

module.exports = {
    initiateVnpay,
};
