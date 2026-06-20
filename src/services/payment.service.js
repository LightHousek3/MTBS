const crypto = require('crypto');
const { Payment, Booking } = require('../models');
const { ApiError } = require('../utils');
const { messages, BOOKING_STATUS } = require('../constants');
const config = require('../config');
const logger = require('../config/logger');

// ── VNPay utilities ───────────────────────────────────────

/**
 * Format a Date to VNPay's yyyyMMddHHmmss, in Vietnam timezone (UTC+7)
 */
const toVnpDateString = (date) => {
    const vnDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    return vnDate
        .toISOString()
        .replace(/[-T:.Z]/g, '')
        .slice(0, 14);
};

/**
 * Sort an object's keys alphabetically and build a query string.
 * IMPORTANT: VNPay requires keys sorted A→Z, values URL-encoded (RFC 3986) with spaces as '+'.
 */
const buildSortedQueryString = (params) => {
    return Object.keys(params)
        .sort()
        .map(
            (key) =>
                `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key])).replace(/%20/g, '+')}`,
        )
        .join('&');
};

/**
 * Compute HMAC-SHA512 signature
 */
const computeHmacSha512 = (secretKey, data) => {
    return crypto.createHmac('sha512', secretKey).update(Buffer.from(data, 'utf-8')).digest('hex');
};

/**
 * Verify VNPay's secure hash from a set of params
 */
const verifyVnpaySignature = (params) => {
    const receivedHash = params['vnp_SecureHash'];
    if (!receivedHash) return false;

    // Remove hash fields before verification
    const signParams = { ...params };
    delete signParams['vnp_SecureHash'];
    delete signParams['vnp_SecureHashType'];

    const signData = buildSortedQueryString(signParams);
    const expectedHash = computeHmacSha512(config.vnpay.hashSecret, signData);

    return receivedHash.toLowerCase() === expectedHash.toLowerCase();
};

// ── Payment creation ──────────────────────────────────────

/**
 * Initiate a VNPay payment for an existing booking.
 *
 * @param {string} bookingId   - Existing booking ID
 * @param {string} userId      - User's id
 * @param {string} clientIp    - Client's real IP address
 * @returns { paymentUrl }
 */
const createVnpayPayment = async ({ bookingId, userId, clientIp }) => {
    const booking = await Booking.findById(bookingId);

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

    // Cancel any previous PENDING payment for this booking (re-initiate scenario)
    await Payment.updateMany(
        { bookingId, paymentStatus: 'PENDING' },
        { paymentStatus: 'CANCELLED' },
    );

    // Create new payment record
    const payment = await Payment.create({
        bookingId,
        paymentMethod: 'VNPAY',
        paymentStatus: 'PENDING',
        amount: booking.totalPrice,
    });

    // ── Build VNPay parameters ────────────────────────────
    const now = new Date();
    const createDate = toVnpDateString(now);
    const expireDate = toVnpDateString(booking.expiresAt);

    // vnp_TxnRef must be unique per payment attempt — use paymentId
    const vnpTxnRef = String(payment._id);

    const vnpParams = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: config.vnpay.tmnCode,
        vnp_Amount: String(booking.totalPrice * 100), // VNPay requires amount * 100
        vnp_CreateDate: createDate,
        vnp_CurrCode: 'VND',
        vnp_IpAddr: clientIp,
        vnp_Locale: 'vn',
        vnp_OrderInfo: `Thanh toan ve phim ${vnpTxnRef}`,
        vnp_OrderType: 'billpayment',
        vnp_ReturnUrl: config.vnpay.returnUrl,
        vnp_TxnRef: vnpTxnRef,
        vnp_ExpireDate: expireDate,
    };

    // Build signed data (sorted params, without hash)
    const signData = buildSortedQueryString(vnpParams);
    const secureHash = computeHmacSha512(config.vnpay.hashSecret, signData);

    // Full payment URL
    const paymentUrl = `${config.vnpay.url}?${signData}&vnp_SecureHash=${secureHash}`;

    logger.info(
        `VNPay payment created: txnRef=${vnpTxnRef}, booking=${bookingId}, amount=${booking.totalPrice}`,
    );

    return paymentUrl;
};

// ── IPN Handler ───────────────────────────────────────────

/**
 * Handle VNPay IPN (Instant Payment Notification).
 * VNPay POSTs to this endpoint after payment is processed (server-to-server).
 *
 * Response format required by VNPay:
 *   { RspCode: "00", Message: "Confirm Success" }  → Success
 *   { RspCode: "XX", Message: "..." }              → Error
 */
const handleVnpayIpn = async (ipnParams) => {
    // Verify signature
    if (!verifyVnpaySignature(ipnParams)) {
        logger.warn('VNPay IPN: invalid signature', { vnpTxnRef: ipnParams['vnp_TxnRef'] });
        return { RspCode: '97', Message: 'Invalid checksum' };
    }

    const vnpTxnRef = ipnParams['vnp_TxnRef'];
    const vnpResponseCode = ipnParams['vnp_ResponseCode'];
    const vnpTransactionNo = ipnParams['vnp_TransactionNo'];

    const vnpAmount = parseInt(ipnParams['vnp_Amount'], 10) / 100;

    const payment = await Payment.findOne({ _id: vnpTxnRef });

    if (!payment) {
        logger.warn(`VNPay IPN: payment not found for txnRef=${vnpTxnRef}`);
        return { RspCode: '01', Message: 'Order not found' };
    }

    // Idempotency: already processed
    if (payment.paymentStatus !== 'PENDING') {
        logger.info(
            `VNPay IPN: already processed txnRef=${vnpTxnRef}, status=${payment.paymentStatus}`,
        );
        return { RspCode: '02', Message: 'Order already confirmed' };
    }

    if (vnpResponseCode === '00') {
        // Payment successful
        payment.paymentStatus = 'COMPLETED';
        payment.transactionNo = vnpTransactionNo;
        payment.paymentTime = new Date();
        await payment.save();

        // Confirm booking
        await Booking.findByIdAndUpdate(payment.bookingId, {
            status: BOOKING_STATUS.CONFIRMED,
            $unset: { expiresAt: '' },
        });

        logger.info(
            `VNPay IPN: payment confirmed txnRef=${vnpTxnRef}, booking=${payment.bookingId}`,
        );
        return { RspCode: '00', Message: 'Confirm Success' };
    } else {
        // Payment failed
        payment.paymentStatus = 'FAILED';
        await payment.save();

        // Mark booking as cancelled if payment failed
        await Booking.findByIdAndUpdate(payment.bookingId, {
            status: BOOKING_STATUS.CANCELLED,
        });

        logger.warn(`VNPay IPN: payment failed txnRef=${vnpTxnRef}, code=${vnpResponseCode}`);
        return { RspCode: '00', Message: 'Confirm Success' }; // Always 00 to acknowledge receipt
    }
};

// ── Return URL Handler ────────────────────────────────────

/**
 * Handle VNPay return URL (customer redirect after payment).
 * Verifies the signature and returns a user-friendly payment result.
 *
 * @returns {{ success: boolean, message: string, data: object }}
 */
const handleVnpayReturn = async (returnParams) => {
    const isValid = verifyVnpaySignature(returnParams);

    if (!isValid) {
        return {
            success: false,
            message: messages.PAYMENT.INVALID_SIGNATURE,
            data: null,
        };
    }

    const vnpResponseCode = returnParams['vnp_ResponseCode'];
    const vnpTxnRef = returnParams['vnp_TxnRef'];

    const payment = await Payment.findOne({ _id: vnpTxnRef }).populate('bookingId');

    if (!payment) {
        return { success: false, message: messages.PAYMENT.NOT_FOUND, data: null };
    }

    return {
        success: vnpResponseCode === '00',
        message: vnpResponseCode === '00' ? messages.PAYMENT.SUCCESS : messages.PAYMENT.FAILED,
        data: {
            bookingId: payment.bookingId,
            paymentId: payment._id,
            amount: payment.amount,
            status: payment.paymentStatus,
            payDate: returnParams['vnp_PayDate'],
        },
    };
};

module.exports = {
    createVnpayPayment,
    handleVnpayIpn,
    handleVnpayReturn,
};
