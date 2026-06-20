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
        const rawBookingId = result?.data?.bookingId;
        const bookingId =
            typeof rawBookingId === 'object' ? rawBookingId?._id || rawBookingId?.id : rawBookingId;

        const isSafeAppUrl = /^(filmgo|exp):\/\//i.test(appReturnUrl);
        const baseAppUrl = isSafeAppUrl ? appReturnUrl : 'filmgo://payment-result';
        const separator = baseAppUrl.includes('?') ? '&' : '?';

        // const redirectParams = new URLSearchParams({
        //     success: String(result.success),
        //     status: result.success ? 'success' : 'failed',
        // });

        if (bookingId) {
            redirectParams.set('bookingId', String(bookingId));
        }

        // if (result.message) {
        //     redirectParams.set('message', result.message);
        // }

        const deepLink = `${baseAppUrl}${separator}${redirectParams.toString()}`;
        const escapedDeepLink = String(deepLink).replace(/"/g, '&quot;');
        const scriptSafeDeepLink = JSON.stringify(String(deepLink));

        return res.status(200).send(`<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FilmGo Payment Return</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #222; }
        .box { max-width: 480px; margin: 48px auto; border: 1px solid #ddd; border-radius: 12px; padding: 20px; }
        .btn { display: inline-block; margin-top: 12px; background: #e94560; color: #fff; text-decoration: none; padding: 10px 14px; border-radius: 8px; }
        .hint { color: #666; font-size: 13px; margin-top: 12px; }
    </style>
</head>
<body>
    <div class="box">
        <h2>Đang quay lại ứng dụng FilmGo...</h2>
        <p>Nếu ứng dụng không tự mở, vui lòng bấm nút bên dưới.</p>
        <a class="btn" href="${escapedDeepLink}">Mở ứng dụng FilmGo</a>
    </div>
    <script>
        var deepLink = ${scriptSafeDeepLink};
        window.location.replace(deepLink);
        setTimeout(function () {
            window.location.href = deepLink;
        }, 300);
    </script>
</body>
</html>`);
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
