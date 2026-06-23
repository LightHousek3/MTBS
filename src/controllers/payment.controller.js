const { paymentService } = require('../services');
const { asyncHandler, ResponseHandler } = require('../utils');
const { messages } = require('../constants');
const logger = require('../config/logger');

/**
 * POST /payments/vnpay
 * Initiate VNPay payment for a pending booking.
 * Returns a redirect URL to the VNPay payment page.
 */
const initiateVnpay = asyncHandler(async (req, res) => {
    const clientIp =
        req.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req.socket?.remoteAddress ||
        '127.0.0.1';

    const paymentUrl = await paymentService.createVnpayPayment({
        bookingId: req.body.bookingId,
        userId: req.user.id,
        clientIp,
        appReturnUrl: req.body.appReturnUrl,
    });

    ResponseHandler.created(res, {
        message: messages.PAYMENT.VNPAY_URL_CREATED,
        data: { paymentUrl },
    });
});

/**
 * POST /payments/vnpay/ipn
 * VNPay IPN (Instant Payment Notification) — server-to-server callback.
 * VNPay expects a specific JSON response format.
 */
const vnpayIpn = asyncHandler(async (req, res) => {
    const params = req.query;
    logger.info('VNPay IPN received', { vnpTxnRef: params['vnp_TxnRef'] });

    const result = await paymentService.handleVnpayIpn(params);
    res.status(200).json(result);
});

/**
 * GET /payments/vnpay/return
 * VNPay return URL — customer is redirected here after payment.
 */
const vnpayReturn = asyncHandler(async (req, res) => {
    const result = await paymentService.handleVnpayReturn(req.query);

    const appReturnUrl = req.query.appReturnUrl;
    if (appReturnUrl) {
        const bookingId = result?.data?.bookingId;

        const isSafeAppUrl = /^mtbs:\/\/\/payment-result(?:[?#]|$)/i.test(appReturnUrl);
        const deepLink = new URL(isSafeAppUrl ? appReturnUrl : 'mtbs:///payment-result');

        deepLink.searchParams.set('success', String(result.success));
        deepLink.searchParams.set('status', result.success ? 'success' : 'failed');

        if (bookingId) {
            deepLink.searchParams.set('bookingId', String(bookingId));
        }

        if (result.message) deepLink.searchParams.set('message', result.message);

        return res.redirect(302, deepLink.toString());
    }

    ResponseHandler.success(res, {
        message: result.message,
        data: result.data,
        statusCode: result.success ? 200 : 400,
    });
});

module.exports = {
    initiateVnpay,
    vnpayIpn,
    vnpayReturn,
};
