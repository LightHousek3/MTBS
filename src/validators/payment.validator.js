const Joi = require('joi');
const { objectId } = require('./custom.validator');

const initiateVnpay = {
    body: Joi.object().keys({
        bookingId: Joi.string().required().custom(objectId),
        appReturnUrl: Joi.string()
            .uri({ allowRelative: false })
            .pattern(/^mtbs:\/\/\/payment-result(?:[?#]|$)/i),
    }),
};

module.exports = {
    initiateVnpay,
};
