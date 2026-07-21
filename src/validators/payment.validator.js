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

const expireMomo = {
    params: Joi.object().keys({
        paymentId: Joi.string().required().custom(objectId),
    }),
};

module.exports = {
    initiateVnpay: initiatePayment,
    initiateMomo: initiatePayment,
    expireMomo,
    initiateZalopay: initiatePayment,
};
