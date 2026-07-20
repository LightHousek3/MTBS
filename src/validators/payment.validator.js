const Joi = require('joi');
const { objectId } = require('./custom.validator');

const initiatePayment = {
    body: Joi.object().keys({
        bookingId: Joi.string().required().custom(objectId),
        appReturnUrl: Joi.string()
            .uri({ allowRelative: false })
            .pattern(/^mtbs:\/\/\/payment-result(?:[?#]|$)/i),
    }),
};

module.exports = {
    initiateVnpay: initiatePayment,
    initiateMomo: initiatePayment,
    initiateZalopay: initiatePayment,
};
