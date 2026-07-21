const express = require('express');
const { refundRequestController } = require('../controllers');
const { authenticate, authorize, validate } = require('../middlewares');
const { refundRequestValidator } = require('../validators');
const { USER_ROLE } = require('../constants');

const router = express.Router();

router.post(
    '/',
    authenticate,
    authorize(USER_ROLE.USER),
    validate(refundRequestValidator.createRefundRequest),
    refundRequestController.createRefundRequest,
);

router.get(
    '/',
    authenticate,
    authorize(USER_ROLE.USER, USER_ROLE.ADMIN),
    validate(refundRequestValidator.getRefundRequests),
    refundRequestController.getRefundRequests,
);

router.get(
    '/booking/:bookingId',
    authenticate,
    authorize(USER_ROLE.USER),
    validate(refundRequestValidator.getRefundRequestByBooking),
    refundRequestController.getRefundRequestByBooking,
);

router.patch(
    '/:id/cancel',
    authenticate,
    authorize(USER_ROLE.USER),
    validate(refundRequestValidator.cancelRefundRequest),
    refundRequestController.cancelRefundRequest,
);

router.patch(
    '/:id/process',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    validate(refundRequestValidator.processRefundRequest),
    refundRequestController.processRefundRequest,
);

router.patch(
    '/:id/query-status',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    validate(refundRequestValidator.queryRefundStatus),
    refundRequestController.queryRefundStatus,
);

router.get(
    '/:id',
    authenticate,
    authorize(USER_ROLE.USER, USER_ROLE.ADMIN),
    validate(refundRequestValidator.getRefundRequest),
    refundRequestController.getRefundRequestById,
);

module.exports = router;
