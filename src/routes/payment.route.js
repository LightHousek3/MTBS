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

module.exports = router;
