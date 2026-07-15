const crypto = require('crypto');
const QRCode = require('qrcode');
const { Payment, Booking, Movie, User, LoyaltyTransaction } = require('../models');
const { ApiError } = require('../utils');
const { messages, BOOKING_STATUS, PAYMENT_STATUS, LOYALTY_TRANSACTION_TYPE } = require('../constants');
const config = require('../config');
const logger = require('../config/logger');
const { refundBookingServices } = require('./helpers/serviceStock');

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
        { new: false, select: 'loyaltyPoints' } 
    );

    const balanceBefore = oldUser.loyaltyPoints || 0;
    const balanceAfter = balanceBefore + pointsEarned;

    await LoyaltyTransaction.create({
        user: oldUser._id,
        type: LOYALTY_TRANSACTION_TYPE.EARN,
        points: pointsEarned,
        balanceBefore,
        balanceAfter,
        description: `Tích điểm từ booking ${booking._id}`,
    });

    return pointsEarned;
};

/**
 * Verify VNPay's secure hash from a set of params
 */
const verifyVnpaySignature = (params) => {
    const receivedHash = params['vnp_SecureHash'];
    if (!receivedHash) return false;

    // VNPay signs only its own vnp_* fields. Internal return URL query params
    // (for example appReturnUrl) must never participate in checksum validation.
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

// ── Payment creation ──────────────────────────────────────

/**
 * Initiate a VNPay payment for an existing booking.
 *
 * @param {string} bookingId   - Existing booking ID
 * @param {string} userId      - User's id
 * @param {string} clientIp    - Client's real IP address
 * @returns { paymentUrl }
 */
const createVnpayPayment = async ({ bookingId, userId, clientIp, appReturnUrl }) => {
    const booking = await Booking.findOne({ _id: bookingId, user: userId });

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
        vnp_ReturnUrl: appReturnUrl
            ? `${config.vnpay.returnUrl}${config.vnpay.returnUrl.includes('?') ? '&' : '?'}appReturnUrl=${encodeURIComponent(appReturnUrl)}`
            : config.vnpay.returnUrl,
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
        const paymentTime = new Date();
        const claimedPayment = await Payment.findOneAndUpdate(
            { _id: payment._id, paymentStatus: PAYMENT_STATUS.PENDING },
            {
                $set: {
                    paymentStatus: PAYMENT_STATUS.COMPLETED,
                    transactionNo: vnpTransactionNo,
                    paymentTime,
                },
            },
            { new: true },
        );

        if (!claimedPayment) {
            logger.info(`VNPay IPN: payment already claimed txnRef=${vnpTxnRef}`);
            return { RspCode: '02', Message: 'Order already confirmed' };
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
            {
                new: true,
            },
        ).populate({
            path: 'showtime',
            select: 'movie',
        });

        if (!booking) {
            claimedPayment.paymentStatus = PAYMENT_STATUS.FAILED;
            await claimedPayment.save();

            logger.warn(
                `VNPay IPN: booking is no longer payable txnRef=${vnpTxnRef}, booking=${claimedPayment.bookingId}`,
            );
            return { RspCode: '02', Message: 'Booking is no longer payable' };
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
        booking.pointsEarned = pointsEarned;
        booking.qrCode = qrCode;

        await Movie.updateOne(
            { _id: booking.showtime.movie },
            {
                $inc: {
                    totalBookings: 1,
                },
            },
        );

        logger.info(
            `VNPay IPN: payment confirmed txnRef=${vnpTxnRef}, booking=${claimedPayment.bookingId}`,
        );
        return { RspCode: '00', Message: 'Confirm Success' };
    } else {
        // Payment failed
        const failedPayment = await Payment.findOneAndUpdate(
            { _id: payment._id, paymentStatus: PAYMENT_STATUS.PENDING },
            { $set: { paymentStatus: PAYMENT_STATUS.FAILED } },
            { new: true },
        );
        if (!failedPayment) {
            logger.info(`VNPay IPN: payment already claimed txnRef=${vnpTxnRef}`);
            return { RspCode: '02', Message: 'Order already confirmed' };
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

    const payment = await Payment.findOne({ _id: vnpTxnRef });

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
