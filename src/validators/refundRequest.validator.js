const Joi = require('joi');
const { objectId, paginationQuery } = require('./custom.validator');
const { REFUND_REQUEST_STATUS } = require('../constants');

const createRefundRequest = {
    body: Joi.object().keys({
        bookingId: Joi.string().required().custom(objectId),
        reason: Joi.string().trim().min(5).max(2000).required(),
    }),
};

const getRefundRequests = {
    query: Joi.object().keys({
        ...paginationQuery,
        status: Joi.string().valid(...Object.values(REFUND_REQUEST_STATUS)),
        bookingId: Joi.string().custom(objectId),
        userId: Joi.string().custom(objectId),
    }),
};

const getRefundRequest = {
    params: Joi.object().keys({
        id: Joi.string().required().custom(objectId),
    }),
};

const getRefundRequestByBooking = {
    params: Joi.object().keys({
        bookingId: Joi.string().required().custom(objectId),
    }),
};

const processRefundRequest = {
    params: Joi.object().keys({
        id: Joi.string().required().custom(objectId),
    }),
    body: Joi.object().keys({
        status: Joi.string()
            .valid(REFUND_REQUEST_STATUS.APPROVED, REFUND_REQUEST_STATUS.REJECTED)
            .required(),
        response: Joi.string().trim().max(2000),
        simulateSuccess: Joi.boolean().default(true),
    }),
};

module.exports = {
    createRefundRequest,
    getRefundRequests,
    getRefundRequest,
    getRefundRequestByBooking,
    cancelRefundRequest: getRefundRequest,
    queryRefundStatus: getRefundRequest,
    processRefundRequest,
};
