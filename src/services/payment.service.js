const crypto = require('crypto');
const axios = require('axios');
const QRCode = require('qrcode');
const { Payment, Booking, Movie, User, LoyaltyTransaction } = require('../models');
const { ApiError } = require('../utils');
const {
    messages,
    BOOKING_STATUS,
    PAYMENT_METHOD,
    PAYMENT_STATUS,
    LOYALTY_TRANSACTION_TYPE,
} = require('../constants');
const config = require('../config');
const logger = require('../config/logger');
const { refundBookingServices } = require('./helpers/serviceStock');

const GATEWAY_TIMEOUT_MS = 30000;
const ZALOPAY_MIN_EXPIRE_SECONDS = 300;

// Payment utilities

const toVnpDateString = (date) => {
    const vnDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    return vnDate
        .toISOString()
        .replace(/[-T:.Z]/g, '')
        .slice(0, 14);
};

const toMomoResponseTime = (date = new Date()) => {
    return String(date.getTime());
};

const toZaloDatePrefix = (date = new Date()) => {
    const vnDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    return vnDate.toISOString().slice(2, 10).replace(/-/g, '');
};

const buildSortedQueryString = (params) =>
    Object.keys(params)
        .sort()
        .map(
            (key) =>
                `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key])).replace(/%20/g, '+')}`,
        )
        .join('&');

const computeHmacSha512 = (secretKey, data) =>
    crypto.createHmac('sha512', secretKey).update(Buffer.from(data, 'utf-8')).digest('hex');

const computeHmacSha256 = (secretKey, data) =>
    crypto.createHmac('sha256', secretKey).update(data, 'utf-8').digest('hex');

const buildJsonResponseText = (payload) => JSON.stringify(payload, null, 2);

const getRemainingPaymentSeconds = (booking, { minSeconds = 1, providerName = 'payment' } = {}) => {
    const expiresAt = booking.expiresAt ? new Date(booking.expiresAt).getTime() : 0;
    const seconds = Math.floor((expiresAt - Date.now()) / 1000);

    if (seconds <= 0) {
        throw ApiError.badRequest(messages.PAYMENT.BOOKING_EXPIRED);
    }

    if (seconds < minSeconds) {
        throw ApiError.badRequest(
            `Thoi gian giu ghe con lai khong du de tao thanh toan ${providerName}. Vui long dat ve lai.`,
        );
    }

    return seconds;
};

const derivePaymentCallbackUrl = (provider, type) => {
    const configured =
        type === 'ipn'
            ? config[provider]?.ipnUrl || config[provider]?.callbackUrl
            : config[provider]?.returnUrl;
    if (configured) return configured;

    if (!config.vnpay.returnUrl) return '';

    const url = new URL(config.vnpay.returnUrl);
    const apiPrefix = config.apiPrefix.replace(/^\//, '');
    url.pathname = `/${apiPrefix}/payments/${provider}/${type === 'ipn' ? 'ipn' : 'return'}`;
    url.search = '';
    return url.toString();
};

const appendAppReturnUrl = (returnUrl, appReturnUrl) => {
    if (!appReturnUrl) return returnUrl;
    const separator = returnUrl.includes('?') ? '&' : '?';
    return `${returnUrl}${separator}appReturnUrl=${encodeURIComponent(appReturnUrl)}`;
};

const buildAppResultUrl = ({ appReturnUrl, result }) => {
    const isSafeAppUrl = /^mtbs:\/\/\/payment-result(?:[?#]|$)/i.test(appReturnUrl || '');
    const deepLink = new URL(isSafeAppUrl ? appReturnUrl : 'mtbs:///payment-result');

    deepLink.searchParams.set('success', String(result.success));
    deepLink.searchParams.set('status', result.success ? 'success' : 'failed');

    if (result?.data?.bookingId) {
        deepLink.searchParams.set('bookingId', String(result.data.bookingId));
    }

    if (result.message) deepLink.searchParams.set('message', result.message);
    return deepLink.toString();
};

const buildBookingQrCode = async ({ booking, payment }) => {
    const payload = {
        bookingId: String(booking._id),
        paymentId: String(payment._id),
        userId: String(booking.user),
        showtimeId: String(booking.showtime._id || booking.showtime),
        movieId: String(booking.showtime.movie?._id || booking.showtime.movie || ''),
        status: BOOKING_STATUS.CONFIRMED,
        totalPrice: booking.totalPrice,
        paidAt: payment.paymentTime.toISOString(),
    };

    return QRCode.toDataURL(JSON.stringify(payload), {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 320,
    });
};

const earnLoyaltyPoints = async (booking) => {
    const pointsEarned = Math.floor((booking.totalPrice || 0) * 0.01);
    if (pointsEarned <= 0) return 0;

    const oldUser = await User.findByIdAndUpdate(
        booking.user,
        { $inc: { loyaltyPoints: pointsEarned } },
        { new: false, select: 'loyaltyPoints' },
    );

    const balanceBefore = oldUser.loyaltyPoints || 0;
    const balanceAfter = balanceBefore + pointsEarned;

    await LoyaltyTransaction.create({
        user: oldUser._id,
        type: LOYALTY_TRANSACTION_TYPE.EARN,
        points: pointsEarned,
        balanceBefore,
        balanceAfter,
        description: `Tich diem tu booking ${booking._id}`,
    });

    return pointsEarned;
};

const assertPayableBooking = async ({ bookingId, userId }) => {
    const booking = await Booking.findOne({ _id: bookingId, user: userId }).populate({
        path: 'user',
        select: 'firstName lastName email phone',
    });

    if (!booking) {
        throw ApiError.notFound(messages.BOOKING.BOOKING_NOT_FOUND);
    }

    if (booking.status === BOOKING_STATUS.CONFIRMED) {
        throw ApiError.conflict(messages.PAYMENT.ALREADY_PAID);
    }

    if (booking.status === BOOKING_STATUS.CANCELLED) {
        throw ApiError.badRequest('This booking has been cancelled');
    }

    if (booking.expiresAt && booking.expiresAt < new Date()) {
        throw ApiError.badRequest(messages.PAYMENT.BOOKING_EXPIRED);
    }

    return booking;
};

const cancelPendingPayments = (bookingId) =>
    Payment.updateMany(
        { bookingId, paymentStatus: PAYMENT_STATUS.PENDING },
        { paymentStatus: PAYMENT_STATUS.CANCELLED },
    );

const confirmPayment = async ({ payment, transactionNo, providerCallback, paymentTime = new Date() }) => {
    const claimedPayment = await Payment.findOneAndUpdate(
        { _id: payment._id, paymentStatus: PAYMENT_STATUS.PENDING },
        {
            $set: {
                paymentStatus: PAYMENT_STATUS.COMPLETED,
                transactionNo,
                paymentTime,
                providerCallback,
            },
        },
        { new: true },
    );

    if (!claimedPayment) {
        const currentPayment = await Payment.findById(payment._id);
        return {
            alreadyProcessed: true,
            confirmed: currentPayment?.paymentStatus === PAYMENT_STATUS.COMPLETED,
            payment: currentPayment,
        };
    }

    const booking = await Booking.findOneAndUpdate(
        {
            _id: claimedPayment.bookingId,
            status: BOOKING_STATUS.PENDING,
            expiresAt: { $gt: new Date() },
        },
        {
            $set: { status: BOOKING_STATUS.CONFIRMED },
            $unset: { expiresAt: '' },
        },
        { new: true },
    ).populate({
        path: 'showtime',
        select: 'movie',
    });

    if (!booking) {
        claimedPayment.paymentStatus = PAYMENT_STATUS.FAILED;
        await claimedPayment.save();

        const cancelledBooking = await Booking.findOneAndUpdate(
            {
                _id: claimedPayment.bookingId,
                status: BOOKING_STATUS.PENDING,
            },
            {
                $set: { status: BOOKING_STATUS.CANCELLED },
                $unset: { expiresAt: '' },
            },
            { new: false },
        ).select('services');

        await refundBookingServices(cancelledBooking);

        logger.warn(
            `Payment callback: booking is no longer payable, payment=${claimedPayment._id}, booking=${claimedPayment.bookingId}`,
        );
        return { alreadyProcessed: false, confirmed: false, payment: claimedPayment };
    }

    const pointsEarned = await earnLoyaltyPoints(booking);
    const qrCode = await buildBookingQrCode({ booking, payment: claimedPayment });

    await Booking.updateOne(
        { _id: booking._id },
        {
            $set: {
                pointsEarned,
                qrCode,
            },
        },
    );

    await Movie.updateOne(
        { _id: booking.showtime.movie },
        {
            $inc: {
                totalBookings: 1,
            },
        },
    );

    return { alreadyProcessed: false, confirmed: true, payment: claimedPayment };
};

const failPayment = async ({ payment, providerCallback }) => {
    const failedPayment = await Payment.findOneAndUpdate(
        { _id: payment._id, paymentStatus: PAYMENT_STATUS.PENDING },
        { $set: { paymentStatus: PAYMENT_STATUS.FAILED, providerCallback } },
        { new: true },
    );

    if (!failedPayment) {
        return { alreadyProcessed: true };
    }

    const cancelledBooking = await Booking.findOneAndUpdate(
        {
            _id: failedPayment.bookingId,
            status: BOOKING_STATUS.PENDING,
        },
        {
            $set: { status: BOOKING_STATUS.CANCELLED },
            $unset: { expiresAt: '' },
        },
        { new: false },
    ).select('services');

    await refundBookingServices(cancelledBooking);
    return { alreadyProcessed: false };
};

// VNPay

const verifyVnpaySignature = (params) => {
    const receivedHash = params.vnp_SecureHash;
    if (!receivedHash) return false;

    const signParams = Object.fromEntries(
        Object.entries(params).filter(
            ([key]) =>
                key.startsWith('vnp_') && key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType',
        ),
    );

    const signData = buildSortedQueryString(signParams);
    const expectedHash = computeHmacSha512(config.vnpay.hashSecret, signData);

    return receivedHash.toLowerCase() === expectedHash.toLowerCase();
};

const createVnpayPayment = async ({ bookingId, userId, clientIp, appReturnUrl }) => {
    const booking = await assertPayableBooking({ bookingId, userId });

    await cancelPendingPayments(bookingId);

    const payment = await Payment.create({
        bookingId,
        paymentMethod: PAYMENT_METHOD.VNPAY,
        paymentStatus: PAYMENT_STATUS.PENDING,
        amount: booking.totalPrice,
    });

    const now = new Date();
    const createDate = toVnpDateString(now);
    const expireDate = toVnpDateString(booking.expiresAt);
    const vnpTxnRef = String(payment._id);

    const vnpParams = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: config.vnpay.tmnCode,
        vnp_Amount: String(booking.totalPrice * 100),
        vnp_CreateDate: createDate,
        vnp_CurrCode: 'VND',
        vnp_IpAddr: clientIp,
        vnp_Locale: 'vn',
        vnp_OrderInfo: `Thanh toan ve phim ${vnpTxnRef}`,
        vnp_OrderType: 'billpayment',
        vnp_ReturnUrl: appendAppReturnUrl(config.vnpay.returnUrl, appReturnUrl),
        vnp_TxnRef: vnpTxnRef,
        vnp_ExpireDate: expireDate,
    };

    const signData = buildSortedQueryString(vnpParams);
    const secureHash = computeHmacSha512(config.vnpay.hashSecret, signData);

    logger.info(
        `VNPay payment created: txnRef=${vnpTxnRef}, booking=${bookingId}, amount=${booking.totalPrice}`,
    );

    return `${config.vnpay.url}?${signData}&vnp_SecureHash=${secureHash}`;
};

const handleVnpayIpn = async (ipnParams) => {
    if (!verifyVnpaySignature(ipnParams)) {
        logger.warn('VNPay IPN: invalid signature', { vnpTxnRef: ipnParams.vnp_TxnRef });
        return { RspCode: '97', Message: 'Invalid checksum' };
    }

    const payment = await Payment.findById(ipnParams.vnp_TxnRef);
    if (!payment) {
        logger.warn(`VNPay IPN: payment not found for txnRef=${ipnParams.vnp_TxnRef}`);
        return { RspCode: '01', Message: 'Order not found' };
    }

    if (payment.paymentStatus !== PAYMENT_STATUS.PENDING) {
        return { RspCode: '02', Message: 'Order already confirmed' };
    }

    if (ipnParams.vnp_ResponseCode === '00') {
        const result = await confirmPayment({
            payment,
            transactionNo: ipnParams.vnp_TransactionNo,
            providerCallback: ipnParams,
        });

        return result.confirmed
            ? { RspCode: '00', Message: 'Confirm Success' }
            : { RspCode: '02', Message: 'Booking is no longer payable' };
    }

    await failPayment({ payment, providerCallback: ipnParams });
    return { RspCode: '00', Message: 'Confirm Success' };
};

const handleVnpayReturn = async (returnParams) => {
    if (!verifyVnpaySignature(returnParams)) {
        return { success: false, message: messages.PAYMENT.INVALID_SIGNATURE, data: null };
    }

    const payment = await Payment.findById(returnParams.vnp_TxnRef);
    if (!payment) {
        return { success: false, message: messages.PAYMENT.NOT_FOUND, data: null };
    }

    const success = returnParams.vnp_ResponseCode === '00';
    return {
        success,
        message: success ? messages.PAYMENT.SUCCESS : messages.PAYMENT.FAILED,
        data: {
            bookingId: payment.bookingId,
            paymentId: payment._id,
            amount: payment.amount,
            status: payment.paymentStatus,
            payDate: returnParams.vnp_PayDate,
        },
    };
};

// MoMo

const createMomoSignature = (params) => {
    const raw = [
        `accessKey=${config.momo.accessKey}`,
        `amount=${params.amount}`,
        `extraData=${params.extraData}`,
        `ipnUrl=${params.ipnUrl}`,
        `orderId=${params.orderId}`,
        `orderInfo=${params.orderInfo}`,
        `partnerCode=${params.partnerCode}`,
        `redirectUrl=${params.redirectUrl}`,
        `requestId=${params.requestId}`,
        `requestType=${params.requestType}`,
    ].join('&');

    return computeHmacSha256(config.momo.secretKey, raw);
};

const createMomoResultSignature = (params) => {
    const valueOf = (key, fallback = '') => params[key] ?? params[key.toLowerCase()] ?? fallback;
    const raw = [
        `accessKey=${config.momo.accessKey}`,
        `amount=${valueOf('amount')}`,
        `extraData=${valueOf('extraData')}`,
        `message=${valueOf('message')}`,
        `orderId=${valueOf('orderId')}`,
        `orderInfo=${valueOf('orderInfo')}`,
        `orderType=${valueOf('orderType')}`,
        `partnerCode=${valueOf('partnerCode')}`,
        `payType=${valueOf('payType')}`,
        `requestId=${valueOf('requestId')}`,
        `responseTime=${valueOf('responseTime')}`,
        `resultCode=${valueOf('resultCode')}`,
        `transId=${valueOf('transId')}`,
    ].join('&');

    return computeHmacSha256(config.momo.secretKey, raw);
};

const verifyMomoResultSignature = (params) => {
    if (!params.signature) return false;

    const expected = createMomoResultSignature(params);
    return expected.toLowerCase() === params.signature.toLowerCase();
};

const createMomoIpnResponse = ({ request, resultCode, message }) => {
    const responseTime = toMomoResponseTime();
    const response = {
        partnerCode: request.partnerCode || config.momo.partnerCode,
        requestId: request.requestId,
        orderId: request.orderId,
        resultCode,
        message,
        responseTime,
        extraData: request.extraData || '',
    };
    const raw = [
        `accessKey=${config.momo.accessKey}`,
        `extraData=${response.extraData}`,
        `message=${response.message}`,
        `orderId=${response.orderId}`,
        `partnerCode=${response.partnerCode}`,
        `requestId=${response.requestId}`,
        `responseTime=${response.responseTime}`,
        `resultCode=${response.resultCode}`,
    ].join('&');
    response.signature = computeHmacSha256(config.momo.secretKey, raw);
    return response;
};

const createMomoPayment = async ({ bookingId, userId, appReturnUrl }) => {
    const booking = await assertPayableBooking({ bookingId, userId });
    const remainingSeconds = getRemainingPaymentSeconds(booking, { providerName: 'MoMo' });
    const redirectUrl = appendAppReturnUrl(derivePaymentCallbackUrl('momo', 'return'), appReturnUrl);
    const ipnUrl = derivePaymentCallbackUrl('momo', 'ipn');

    if (!redirectUrl || !ipnUrl) {
        throw ApiError.internal('MoMo returnUrl/ipnUrl is not configured');
    }

    await cancelPendingPayments(bookingId);

    const payment = await Payment.create({
        bookingId,
        paymentMethod: PAYMENT_METHOD.MOMO,
        paymentStatus: PAYMENT_STATUS.PENDING,
        amount: booking.totalPrice,
    });

    const user = booking.user || {};
    const orderId = String(payment._id);
    const requestId = String(payment._id);
    const extraData = Buffer.from(
        JSON.stringify({
            bookingId,
            paymentId: payment._id,
            bookingExpiresAt: booking.expiresAt.toISOString(),
            remainingSeconds,
        }),
    ).toString('base64');

    const payload = {
        partnerCode: config.momo.partnerCode,
        partnerName: 'MTBS',
        storeId: 'MTBS',
        requestType: 'payWithATM',
        ipnUrl,
        redirectUrl,
        orderId,
        amount: Math.round(booking.totalPrice),
        lang: 'vi',
        orderInfo: `Thanh toan ve phim ${orderId}`,
        requestId,
        extraData,
        userInfo: {
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'MTBS Customer',
            phoneNumber: user.phone || '',
            email: user.email || 'customer@mtbs.vn',
        },
    };
    payload.signature = createMomoSignature(payload);

    const response = await axios.post(config.momo.apiUrl, payload, {
        timeout: GATEWAY_TIMEOUT_MS,
        headers: { 'Content-Type': 'application/json' },
    });

    const data = response.data;
    await Payment.updateOne(
        { _id: payment._id },
        {
            $set: {
                providerOrderId: orderId,
                requestId,
                providerResponse: data,
            },
        },
    );

    if (data.resultCode !== 0 || !data.payUrl) {
        await Payment.updateOne(
            { _id: payment._id },
            { $set: { paymentStatus: PAYMENT_STATUS.FAILED } },
        );
        throw ApiError.badRequest(data.message || messages.PAYMENT.FAILED);
    }

    logger.info(`MoMo payment created: orderId=${orderId}, booking=${bookingId}`);
    return data.payUrl;
};

const handleMomoIpn = async (body) => {
    if (!verifyMomoResultSignature(body)) {
        logger.warn('MoMo IPN: invalid signature', { orderId: body.orderId });
        return createMomoIpnResponse({
            request: body,
            resultCode: 97,
            message: 'Invalid signature',
        });
    }

    const payment = await Payment.findOne({
        providerOrderId: body.orderId,
        paymentMethod: PAYMENT_METHOD.MOMO,
    });

    if (!payment) {
        return createMomoIpnResponse({
            request: body,
            resultCode: 1,
            message: 'Order not found',
        });
    }

    if (Number(body.resultCode) === 0) {
        await confirmPayment({
            payment,
            transactionNo: String(body.transId || ''),
            providerCallback: body,
        });
    } else {
        await failPayment({ payment, providerCallback: body });
    }

    return createMomoIpnResponse({
        request: body,
        resultCode: 0,
        message: 'Confirm Success',
    });
};

const handleMomoReturn = async (params) => {
    if (!verifyMomoResultSignature(params)) {
        return { success: false, message: messages.PAYMENT.INVALID_SIGNATURE, data: null };
    }

    const payment = await Payment.findOne({
        providerOrderId: params.orderId,
        paymentMethod: PAYMENT_METHOD.MOMO,
    });

    if (!payment) {
        return { success: false, message: messages.PAYMENT.NOT_FOUND, data: null };
    }

    const momoSucceeded = Number(params.resultCode) === 0;
    let currentPayment = payment;

    if (momoSucceeded && payment.paymentStatus === PAYMENT_STATUS.PENDING) {
        const result = await confirmPayment({
            payment,
            transactionNo: String(params.transId || ''),
            providerCallback: params,
        });
        currentPayment = result.payment || payment;
    }

    const success = momoSucceeded && currentPayment.paymentStatus === PAYMENT_STATUS.COMPLETED;
    return {
        success,
        message: success
            ? messages.PAYMENT.SUCCESS
            : momoSucceeded
              ? messages.PAYMENT.BOOKING_EXPIRED
              : params.message || messages.PAYMENT.FAILED,
        data: {
            bookingId: currentPayment.bookingId,
            paymentId: currentPayment._id,
            amount: currentPayment.amount,
            status: currentPayment.paymentStatus,
            payDate: params.responseTime,
        },
    };
};

// ZaloPay

const createZalopayPayment = async ({ bookingId, userId, clientIp, appReturnUrl }) => {
    const booking = await assertPayableBooking({ bookingId, userId });
    const expireDurationSeconds = getRemainingPaymentSeconds(booking, {
        minSeconds: ZALOPAY_MIN_EXPIRE_SECONDS,
        providerName: 'ZaloPay',
    });
    const redirectUrl = appendAppReturnUrl(
        derivePaymentCallbackUrl('zalopay', 'return'),
        appReturnUrl,
    );
    const callbackUrl = derivePaymentCallbackUrl('zalopay', 'ipn');

    if (!redirectUrl || !callbackUrl) {
        throw ApiError.internal('ZaloPay returnUrl/callbackUrl is not configured');
    }

    await cancelPendingPayments(bookingId);

    const payment = await Payment.create({
        bookingId,
        paymentMethod: PAYMENT_METHOD.ZALOPAY,
        paymentStatus: PAYMENT_STATUS.PENDING,
        amount: booking.totalPrice,
    });

    const appTransId = `${toZaloDatePrefix()}_${payment._id}`;
    const appTime = Date.now();
    const appUser = String(userId).slice(0, 50);
    const embedData = JSON.stringify({
        redirecturl: redirectUrl,
        preferred_payment_method: ['domestic_card', 'account'],
        bookingId,
        paymentId: String(payment._id),
        bookingExpiresAt: booking.expiresAt.toISOString(),
    });
    const item = JSON.stringify([]);
    const amount = Math.round(booking.totalPrice);
    const macInput = [
        config.zalopay.appId,
        appTransId,
        appUser,
        amount,
        appTime,
        embedData,
        item,
    ].join('|');

    const payload = {
        app_id: config.zalopay.appId,
        app_user: appUser,
        app_trans_id: appTransId,
        app_time: appTime,
        expire_duration_seconds: expireDurationSeconds,
        amount,
        item,
        embed_data: embedData,
        description: `MTBS - Thanh toan booking ${String(bookingId).slice(-8)}`,
        callback_url: callbackUrl,
        redirect_url: redirectUrl,
        bank_code: '',
        userIP: clientIp,
        mac: computeHmacSha256(config.zalopay.key1, macInput),
    };

    const response = await axios.post(config.zalopay.createUrl, payload, {
        timeout: GATEWAY_TIMEOUT_MS,
        headers: { 'Content-Type': 'application/json' },
    });

    const data = response.data;
    await Payment.updateOne(
        { _id: payment._id },
        {
            $set: {
                providerOrderId: appTransId,
                requestId: appTransId,
                providerResponse: data,
            },
        },
    );

    if (data.return_code !== 1 || !data.order_url) {
        await Payment.updateOne(
            { _id: payment._id },
            { $set: { paymentStatus: PAYMENT_STATUS.FAILED } },
        );
        throw ApiError.badRequest(data.return_message || messages.PAYMENT.FAILED);
    }

    logger.info(`ZaloPay payment created: appTransId=${appTransId}, booking=${bookingId}`);
    return data.order_url;
};

const handleZalopayCallback = async (body) => {
    const expectedMac = computeHmacSha256(config.zalopay.key2, body.data || '');
    if (!body.mac || expectedMac.toLowerCase() !== body.mac.toLowerCase()) {
        logger.warn('ZaloPay callback: invalid mac');
        return { return_code: 2, return_message: 'Invalid' };
    }

    const data = JSON.parse(body.data);
    const payment = await Payment.findOne({
        providerOrderId: data.app_trans_id,
        paymentMethod: PAYMENT_METHOD.ZALOPAY,
    });

    if (!payment) {
        return { return_code: 2, return_message: 'Order not found' };
    }

    await confirmPayment({
        payment,
        transactionNo: String(data.zp_trans_id || ''),
        providerCallback: { ...body, parsedData: data },
        paymentTime: data.server_time ? new Date(data.server_time) : new Date(),
    });

    return { return_code: 1, return_message: 'Success' };
};

const handleZalopayReturn = async (params) => {
    const appTransId =
        params.apptransid || params.app_trans_id || params.appTransId || params.app_transid;

    if (!appTransId) {
        return { success: false, message: messages.PAYMENT.NOT_FOUND, data: null };
    }

    const payment = await Payment.findOne({
        providerOrderId: appTransId,
        paymentMethod: PAYMENT_METHOD.ZALOPAY,
    });

    if (!payment) {
        return { success: false, message: messages.PAYMENT.NOT_FOUND, data: null };
    }

    const success = payment.paymentStatus === PAYMENT_STATUS.COMPLETED;
    return {
        success,
        message: success ? messages.PAYMENT.SUCCESS : messages.PAYMENT.PENDING,
        data: {
            bookingId: payment.bookingId,
            paymentId: payment._id,
            amount: payment.amount,
            status: payment.paymentStatus,
        },
    };
};

const createMomoRefund = async ({ refundRequest, payment }) => {
    const orderId = `RF${refundRequest._id}`;
    const requestId = orderId;
    const amount = Math.round(refundRequest.refundAmount);
    const transId = payment.transactionNo;
    const description = refundRequest.reason || `Refund booking ${refundRequest.bookingId}`;
    const raw = [
        `accessKey=${config.momo.accessKey}`,
        `amount=${amount}`,
        `description=${description}`,
        `orderId=${orderId}`,
        `partnerCode=${config.momo.partnerCode}`,
        `requestId=${requestId}`,
        `transId=${transId}`,
    ].join('&');

    const payload = {
        partnerCode: config.momo.partnerCode,
        orderId,
        requestId,
        amount,
        transId: Number(transId),
        lang: 'vi',
        description,
        signature: computeHmacSha256(config.momo.secretKey, raw),
    };

    const response = await axios.post(config.momo.refundUrl, payload, {
        timeout: GATEWAY_TIMEOUT_MS,
        headers: { 'Content-Type': 'application/json' },
    });

    return {
        success: response.data?.resultCode === 0,
        providerRefundId: orderId,
        response: response.data,
    };
};

const createZalopayRefund = async ({ refundRequest, payment }) => {
    const timestamp = Date.now();
    const amount = Math.round(refundRequest.refundAmount);
    const mRefundId = `${toZaloDatePrefix()}_${config.zalopay.appId}_${String(refundRequest._id).slice(-16)}`;
    const description = (refundRequest.reason || `Refund booking ${refundRequest.bookingId}`).slice(
        0,
        100,
    );
    const macInput = [
        config.zalopay.appId,
        payment.transactionNo,
        amount,
        description,
        timestamp,
    ].join('|');

    const payload = {
        app_id: config.zalopay.appId,
        m_refund_id: mRefundId,
        zp_trans_id: payment.transactionNo,
        amount,
        timestamp,
        description,
        mac: computeHmacSha256(config.zalopay.key1, macInput),
    };

    const response = await axios.post(config.zalopay.refundUrl, payload, {
        timeout: GATEWAY_TIMEOUT_MS,
        headers: { 'Content-Type': 'application/json' },
    });

    return {
        success: response.data?.return_code === 1 || response.data?.return_code === 3,
        providerRefundId: mRefundId,
        response: response.data,
    };
};

const queryMomoRefund = async ({ refundRequest }) => {
    const orderId = refundRequest.providerRefundId;
    if (!orderId) {
        throw ApiError.badRequest('Không tìm thấy mã hoàn tiền MoMo để truy vấn');
    }

    const requestId = `QUERY_${refundRequest._id}_${Date.now()}`;
    const raw = [
        `accessKey=${config.momo.accessKey}`,
        `orderId=${orderId}`,
        `partnerCode=${config.momo.partnerCode}`,
        `requestId=${requestId}`,
    ].join('&');

    const payload = {
        partnerCode: config.momo.partnerCode,
        requestId,
        orderId,
        lang: 'vi',
        signature: computeHmacSha256(config.momo.secretKey, raw),
    };

    const response = await axios.post(config.momo.queryUrl, payload, {
        timeout: GATEWAY_TIMEOUT_MS,
        headers: { 'Content-Type': 'application/json' },
    });

    return response.data;
};

const queryZalopayRefund = async ({ refundRequest }) => {
    const mRefundId = refundRequest.providerRefundId;
    if (!mRefundId) {
        throw ApiError.badRequest('Không tìm thấy mã hoàn tiền ZaloPay để truy vấn');
    }

    const timestamp = Date.now();
    const macInput = [config.zalopay.appId, mRefundId, timestamp].join('|');
    const payload = {
        app_id: config.zalopay.appId,
        m_refund_id: mRefundId,
        timestamp,
        mac: computeHmacSha256(config.zalopay.key1, macInput),
    };

    const response = await axios.post(config.zalopay.queryRefundUrl, payload, {
        timeout: GATEWAY_TIMEOUT_MS,
        headers: { 'Content-Type': 'application/json' },
    });

    return response.data;
};

module.exports = {
    createVnpayPayment,
    handleVnpayIpn,
    handleVnpayReturn,
    createMomoPayment,
    handleMomoIpn,
    handleMomoReturn,
    createZalopayPayment,
    handleZalopayCallback,
    handleZalopayReturn,
    createMomoRefund,
    createZalopayRefund,
    queryMomoRefund,
    queryZalopayRefund,
    buildAppResultUrl,
    buildJsonResponseText,
};
