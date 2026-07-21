const express = require('express');
const { paymentController } = require('../controllers');
const { authenticate, validate } = require('../middlewares');
const { paymentValidator } = require('../validators');

const router = express.Router();

/**
 * @route   POST /api/v1/payments/vnpay
 * @desc    Initiate VNPay payment for a booking. Returns payment URL.
 * @access  Customer (authenticated)
 */
router.post(
    '/vnpay',
    authenticate,
    validate(paymentValidator.initiateVnpay),
    paymentController.initiateVnpay,
);

router.post(
    '/momo',
    authenticate,
    validate(paymentValidator.initiateMomo),
    paymentController.initiateMomo,
);

router.post(
    '/momo/:paymentId/expire',
    authenticate,
    validate(paymentValidator.expireMomo),
    paymentController.expireMomo,
);

router.post(
    '/zalopay',
    authenticate,
    validate(paymentValidator.initiateZalopay),
    paymentController.initiateZalopay,
);

/**
 * @route   GET /api/v1/payments/vnpay/ipn
 * @desc    VNPay IPN callback (server-to-server). No auth required.
 * @access  Public (VNPay server)
 */
router.get('/vnpay/ipn', paymentController.vnpayIpn);

/**
 * @route   GET /api/v1/payments/vnpay/return
 * @desc    VNPay return URL (customer redirect after payment). No auth required.
 * @access  Public
 */
router.get('/vnpay/return', paymentController.vnpayReturn);

router.post('/momo/ipn', paymentController.momoIpn);
router.get('/momo/return', paymentController.momoReturn);

router.post('/zalopay/ipn', paymentController.zalopayCallback);
router.post('/zalopay/callback', paymentController.zalopayCallback);
router.get('/zalopay/return', paymentController.zalopayReturn);

module.exports = router;
