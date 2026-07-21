const {
    Booking,
    Payment,
    RefundRequest,
    User,
    LoyaltyTransaction,
    Movie,
} = require('../models');
const { ApiError } = require('../utils');
const {
    messages,
    BOOKING_STATUS,
    PAYMENT_METHOD,
    PAYMENT_STATUS,
    REFUND_REQUEST_STATUS,
    LOYALTY_TRANSACTION_TYPE,
} = require('../constants');
const paymentService = require('./payment.service');
const { refundBookingServices } = require('./helpers/serviceStock');
const {
    getRefundPointsRequirement,
    assertRefundPointsBalance,
} = require('./helpers/refundPolicy');

const REFUND_CUTOFF_HOURS = 12;
const REFUND_CUTOFF_MS = REFUND_CUTOFF_HOURS * 60 * 60 * 1000;

const refundPopulate = [
    { path: 'userId', select: 'firstName lastName email phone' },
    { path: 'processedBy', select: 'firstName lastName email' },
    {
        path: 'bookingId',
        populate: [
            {
                path: 'showtime',
                select: 'startTime endTime movie screen',
                populate: [
                    { path: 'movie', select: 'title image' },
                    {
                        path: 'screen',
                        select: 'name theater',
                        populate: { path: 'theater', select: 'name address' },
                    },
                ],
            },
            { path: 'seats.seat', select: 'seatNumber type' },
            { path: 'services.service', select: 'name type price' },
        ],
    },
];

const stringifyResponse = (response) =>
    typeof response === 'string' ? response : paymentService.buildJsonResponseText(response);

const parseStoredResponse = (response) => {
    if (!response || typeof response !== 'string') return {};
    try {
        return JSON.parse(response);
    } catch (error) {
        return {};
    }
};

const assertBeforeRefundCutoff = (booking) => {
    const startTime = new Date(booking.showtime?.startTime || booking.showtime?.startTime);
    if (!startTime || Number.isNaN(startTime.getTime())) {
        throw ApiError.badRequest('Không xác định được thời gian suất chiếu');
    }

    if (startTime.getTime() - Date.now() < REFUND_CUTOFF_MS) {
        throw ApiError.badRequest(
            `Chỉ có thể yêu cầu hoàn tiền trước ít nhất ${REFUND_CUTOFF_HOURS} tiếng so với suất chiếu`,
        );
    }
};

const getConfirmedBookingForRefund = async ({ bookingId, userId, requireOwner = true }) => {
    const filter = { _id: bookingId };
    if (requireOwner) filter.user = userId;

    const booking = await Booking.findOne(filter).populate({
        path: 'showtime',
        select: 'startTime movie',
    });

    if (!booking) {
        throw ApiError.notFound(messages.BOOKING.BOOKING_NOT_FOUND);
    }

    if (booking.status !== BOOKING_STATUS.CONFIRMED) {
        throw ApiError.badRequest('Chỉ booking đã xác nhận mới được yêu cầu hoàn tiền');
    }

    assertBeforeRefundCutoff(booking);
    return booking;
};

const assertRefundEligibility = async ({ booking, userId }) => {
    const requiredPoints = getRefundPointsRequirement(booking);
    if (requiredPoints <= 0) return { requiredPoints: 0, currentPoints: 0 };

    const user = await User.findById(userId).select('loyaltyPoints');
    if (!user) {
        throw ApiError.notFound(messages.CRUD.NOT_FOUND('User'));
    }

    const currentPoints = user.loyaltyPoints || 0;
    assertRefundPointsBalance({ requiredPoints, currentPoints });

    return { requiredPoints, currentPoints };
};

const createRefundRequest = async ({ bookingId, userId, reason }) => {
    const booking = await getConfirmedBookingForRefund({ bookingId, userId });
    await assertRefundEligibility({ booking, userId });

    const existing = await RefundRequest.findOne({
        bookingId,
    });

    if (existing) {
        throw ApiError.conflict('Booking này đã tạo yêu cầu hoàn tiền');
    }

    let refundRequest;
    try {
        refundRequest = await RefundRequest.create({
            bookingId,
            userId,
            reason,
            status: REFUND_REQUEST_STATUS.PENDING,
            refundAmount: booking.totalPrice,
        });
    } catch (error) {
        if (error?.code === 11000) {
            throw ApiError.conflict('Booking này đã tạo yêu cầu hoàn tiền');
        }

        throw error;
    }

    return RefundRequest.findById(refundRequest._id).populate(refundPopulate);
};

const getRefundRequests = async (filter, options, requestingUser) => {
    const queryFilter = {};
    if (filter.status) queryFilter.status = filter.status;
    if (filter.bookingId) queryFilter.bookingId = filter.bookingId;

    if (requestingUser.role !== 'ADMIN') {
        queryFilter.userId = requestingUser.id;
    } else if (filter.userId) {
        queryFilter.userId = filter.userId;
    }

    return RefundRequest.paginate(queryFilter, {
        ...options,
        populate: options.populate || refundPopulate,
        sortBy: options.sortBy || 'createdAt:desc',
    });
};

const getRefundRequestById = async (id, requestingUser) => {
    const refundRequest = await RefundRequest.findById(id).populate(refundPopulate);
    if (!refundRequest) {
        throw ApiError.notFound(messages.CRUD.NOT_FOUND('Refund request'));
    }

    if (
        requestingUser.role !== 'ADMIN' &&
        String(refundRequest.userId?._id || refundRequest.userId) !== String(requestingUser.id)
    ) {
        throw ApiError.forbidden(messages.AUTH.FORBIDDEN);
    }

    return refundRequest;
};

const getRefundRequestByBooking = async ({ bookingId, userId }) =>
    RefundRequest.findOne({ bookingId, userId }).sort({ createdAt: -1 }).populate(refundPopulate);

const cancelRefundRequest = async ({ id, userId }) => {
    const refundRequest = await RefundRequest.findOneAndUpdate(
        {
            _id: id,
            userId,
            status: REFUND_REQUEST_STATUS.PENDING,
        },
        {
            $set: {
                status: REFUND_REQUEST_STATUS.CANCELLED,
                response: 'Customer cancelled refund request',
            },
        },
        { new: true },
    ).populate(refundPopulate);

    if (!refundRequest) {
        throw ApiError.badRequest('Chỉ có thể hủy yêu cầu hoàn tiền đang chờ xử lý');
    }

    return refundRequest;
};

const findCompletedPayment = async (bookingId) => {
    const payment = await Payment.findOne({
        bookingId,
        paymentStatus: PAYMENT_STATUS.COMPLETED,
    }).sort({ paymentTime: -1, createdAt: -1 });

    if (!payment) {
        throw ApiError.notFound('Không tìm thấy giao dịch đã thanh toán để hoàn tiền');
    }

    if (
        [PAYMENT_METHOD.MOMO, PAYMENT_METHOD.ZALOPAY].includes(payment.paymentMethod) &&
        !payment.transactionNo
    ) {
        throw ApiError.badRequest('Giao dịch chưa có mã transaction từ cổng thanh toán');
    }

    return payment;
};

const applySuccessfulRefund = async ({ refundRequest, payment, adminId, gatewayResponse }) => {
    const booking = await Booking.findById(refundRequest.bookingId)
        .populate({ path: 'showtime', select: 'movie' })
        .select('status services pointsEarned showtime user');

    if (!booking) {
        throw ApiError.notFound(messages.BOOKING.BOOKING_NOT_FOUND);
    }

    if (booking.status !== BOOKING_STATUS.REFUNDED) {
        await Booking.updateOne(
            { _id: booking._id },
            { $set: { status: BOOKING_STATUS.REFUNDED, qrCode: null } },
        );
        await refundBookingServices(booking);
        await Movie.updateOne(
            { _id: booking.showtime?.movie },
            { $inc: { totalBookings: -1 } },
        );
    }

    await Payment.updateOne(
        { _id: payment._id },
        {
            $set: {
                paymentStatus: PAYMENT_STATUS.REFUNDED,
                providerResponse: {
                    ...(payment.providerResponse || {}),
                    refund: gatewayResponse,
                },
            },
        },
    );

    const pointsToDeduct = getRefundPointsRequirement(booking);
    if (pointsToDeduct > 0) {
        const user = await User.findById(booking.user).select('loyaltyPoints');
        if (!user) {
            throw ApiError.notFound(messages.CRUD.NOT_FOUND('User'));
        }

        const balanceBefore = user.loyaltyPoints || 0;
        assertRefundPointsBalance({ requiredPoints: pointsToDeduct, currentPoints: balanceBefore });

        user.loyaltyPoints = balanceBefore - pointsToDeduct;
        await user.save();

        await LoyaltyTransaction.create({
            user: user._id,
            type: LOYALTY_TRANSACTION_TYPE.SPEND,
            points: pointsToDeduct,
            balanceBefore,
            balanceAfter: user.loyaltyPoints,
            description: `Thu hoi diem tu booking hoan tien ${booking._id}`,
        });
    }

    return RefundRequest.findOneAndUpdate(
        { _id: refundRequest._id, status: REFUND_REQUEST_STATUS.PENDING },
        {
            $set: {
                status: REFUND_REQUEST_STATUS.APPROVED,
                processedBy: adminId,
                response: stringifyResponse(gatewayResponse),
                providerRefundId: gatewayResponse.providerRefundId || '',
                refundedAt: new Date(),
            },
        },
        { new: true },
    ).populate(refundPopulate);
};

const processRefundRequest = async ({ id, adminId, status, response, simulateSuccess = true }) => {
    const refundRequest = await RefundRequest.findOne({
        _id: id,
        status: REFUND_REQUEST_STATUS.PENDING,
    });

    if (!refundRequest) {
        throw ApiError.badRequest('Yêu cầu hoàn tiền không tồn tại hoặc đã được xử lý');
    }

    if (status === REFUND_REQUEST_STATUS.REJECTED) {
        return RefundRequest.findByIdAndUpdate(
            id,
            {
                $set: {
                    status: REFUND_REQUEST_STATUS.REJECTED,
                    processedBy: adminId,
                    response: response || 'Admin rejected refund request',
                },
            },
            { new: true },
        ).populate(refundPopulate);
    }

    const booking = await getConfirmedBookingForRefund({
        bookingId: refundRequest.bookingId,
        userId: refundRequest.userId,
        requireOwner: false,
    });
    await assertRefundEligibility({ booking, userId: refundRequest.userId });

    const payment = await findCompletedPayment(refundRequest.bookingId);
    let gatewayResult;

    if (payment.paymentMethod === PAYMENT_METHOD.MOMO) {
        gatewayResult = await paymentService.createMomoRefund({ refundRequest, payment });
    } else if (payment.paymentMethod === PAYMENT_METHOD.ZALOPAY) {
        gatewayResult = await paymentService.createZalopayRefund({ refundRequest, payment });
    } else {
        gatewayResult = {
            success: Boolean(simulateSuccess),
            response: {
                gateway: PAYMENT_METHOD.VNPAY,
                simulated: true,
                success: Boolean(simulateSuccess),
                message: simulateSuccess ? 'VNPay refund simulated successfully' : 'VNPay refund simulated failure',
            },
        };
    }

    if (!gatewayResult.success) {
        await RefundRequest.updateOne(
            { _id: refundRequest._id },
            { $set: { response: stringifyResponse(gatewayResult.response) } },
        );
        throw ApiError.badRequest('Cổng thanh toán chưa hoàn tiền thành công');
    }

    return applySuccessfulRefund({
        refundRequest,
        payment,
        adminId,
        gatewayResponse: {
            ...gatewayResult.response,
            providerRefundId: gatewayResult.providerRefundId,
        },
    });
};

const getProviderRefundId = (refundRequest) => {
    if (refundRequest.providerRefundId) return refundRequest.providerRefundId;

    const storedResponse = parseStoredResponse(refundRequest.response);
    return (
        storedResponse.providerRefundId ||
        storedResponse.orderId ||
        storedResponse.m_refund_id ||
        storedResponse.requestId ||
        ''
    );
};

const queryRefundStatus = async (id) => {
    const refundRequest = await RefundRequest.findById(id);
    if (!refundRequest) {
        throw ApiError.notFound(messages.CRUD.NOT_FOUND('Refund request'));
    }

    if (refundRequest.status !== REFUND_REQUEST_STATUS.APPROVED) {
        throw ApiError.badRequest('Chỉ có thể truy vấn yêu cầu hoàn tiền đã được duyệt');
    }

    const payment = await Payment.findOne({
        bookingId: refundRequest.bookingId,
        paymentStatus: PAYMENT_STATUS.REFUNDED,
    }).sort({ updatedAt: -1, paymentTime: -1, createdAt: -1 });

    if (!payment) {
        throw ApiError.notFound('Không tìm thấy giao dịch đã hoàn tiền');
    }

    const providerRefundId = getProviderRefundId(refundRequest);
    refundRequest.providerRefundId = providerRefundId;

    let queryResponse;
    if (payment.paymentMethod === PAYMENT_METHOD.MOMO) {
        queryResponse = await paymentService.queryMomoRefund({ refundRequest, payment });
    } else if (payment.paymentMethod === PAYMENT_METHOD.ZALOPAY) {
        queryResponse = await paymentService.queryZalopayRefund({ refundRequest, payment });
    } else {
        queryResponse = {
            gateway: PAYMENT_METHOD.VNPAY,
            simulated: true,
            message: 'VNPay refund was simulated locally; no provider query API is configured.',
            refundRequestId: String(refundRequest._id),
            status: refundRequest.status,
        };
    }

    refundRequest.providerQueryResponse = queryResponse;
    refundRequest.queriedAt = new Date();
    await refundRequest.save();

    return {
        refundRequest: await RefundRequest.findById(id).populate(refundPopulate),
        paymentMethod: payment.paymentMethod,
        providerRefundId,
        queryResponse,
        queriedAt: refundRequest.queriedAt,
    };
};

module.exports = {
    REFUND_CUTOFF_HOURS,
    createRefundRequest,
    getRefundRequests,
    getRefundRequestById,
    getRefundRequestByBooking,
    cancelRefundRequest,
    processRefundRequest,
    queryRefundStatus,
};
