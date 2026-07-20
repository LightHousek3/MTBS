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

const initiateMomo = asyncHandler(async (req, res) => {
    const paymentUrl = await paymentService.createMomoPayment({
        bookingId: req.body.bookingId,
        userId: req.user.id,
        appReturnUrl: req.body.appReturnUrl,
    });

    ResponseHandler.created(res, {
        message: 'Tạo đường dẫn thanh toán MoMo thành công',
        data: { paymentUrl },
    });
});

const initiateZalopay = asyncHandler(async (req, res) => {
    const clientIp =
        req.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req.socket?.remoteAddress ||
        '127.0.0.1';

    const paymentUrl = await paymentService.createZalopayPayment({
        bookingId: req.body.bookingId,
        userId: req.user.id,
        clientIp,
        appReturnUrl: req.body.appReturnUrl,
    });

    ResponseHandler.created(res, {
        message: 'Tạo đường dẫn thanh toán ZaloPay thành công',
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
        return res.redirect(302, paymentService.buildAppResultUrl({ appReturnUrl, result }));
    }

    ResponseHandler.success(res, {
        message: result.message,
        data: result.data,
        statusCode: result.success ? 200 : 400,
    });
});

const momoIpn = asyncHandler(async (req, res) => {
    logger.info('MoMo IPN received', { orderId: req.body?.orderId });
    const result = await paymentService.handleMomoIpn(req.body);
    res.status(200).json(result);
});

const momoReturn = asyncHandler(async (req, res) => {
    const result = await paymentService.handleMomoReturn(req.query);

    const appReturnUrl = req.query.appReturnUrl;
    if (appReturnUrl) {
        return res.redirect(302, paymentService.buildAppResultUrl({ appReturnUrl, result }));
    }

    ResponseHandler.success(res, {
        message: result.message,
        data: result.data,
        statusCode: result.success ? 200 : 400,
    });
});

const zalopayCallback = asyncHandler(async (req, res) => {
    logger.info('ZaloPay callback received');
    const result = await paymentService.handleZalopayCallback(req.body);
    res.status(200).json(result);
});

const zalopayReturn = asyncHandler(async (req, res) => {
    const result = await paymentService.handleZalopayReturn(req.query);

    const appReturnUrl = req.query.appReturnUrl;
    if (appReturnUrl) {
        return res.redirect(302, paymentService.buildAppResultUrl({ appReturnUrl, result }));
    }

    ResponseHandler.success(res, {
        message: result.message,
        data: result.data,
        statusCode: result.success ? 200 : 400,
    });
});

module.exports = {
    initiateVnpay,
    initiateMomo,
    initiateZalopay,
    vnpayIpn,
    vnpayReturn,
    momoIpn,
    momoReturn,
    zalopayCallback,
    zalopayReturn,
};
