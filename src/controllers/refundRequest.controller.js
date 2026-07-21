const { refundRequestService } = require('../services');
const { asyncHandler, ResponseHandler, pick } = require('../utils');
const { messages } = require('../constants');

const createRefundRequest = asyncHandler(async (req, res) => {
    const refundRequest = await refundRequestService.createRefundRequest({
        bookingId: req.body.bookingId,
        userId: req.user.id,
        reason: req.body.reason,
    });

    ResponseHandler.created(res, {
        message: messages.CRUD.CREATED('Refund request'),
        data: refundRequest,
    });
});

const getRefundRequests = asyncHandler(async (req, res) => {
    const filter = pick(req.query, ['status', 'bookingId', 'userId']);
    const options = pick(req.query, ['sortBy', 'limit', 'page', 'select', 'populate']);
    const result = await refundRequestService.getRefundRequests(filter, options, req.user);

    ResponseHandler.paginated(res, {
        message: messages.CRUD.LIST_FETCHED('Refund requests'),
        data: result.results,
        meta: result.meta,
    });
});

const getRefundRequestById = asyncHandler(async (req, res) => {
    const refundRequest = await refundRequestService.getRefundRequestById(req.params.id, req.user);
    ResponseHandler.success(res, {
        message: messages.CRUD.FETCHED('Refund request'),
        data: refundRequest,
    });
});

const getRefundRequestByBooking = asyncHandler(async (req, res) => {
    const refundRequest = await refundRequestService.getRefundRequestByBooking({
        bookingId: req.params.bookingId,
        userId: req.user.id,
    });

    ResponseHandler.success(res, {
        message: messages.CRUD.FETCHED('Refund request'),
        data: refundRequest,
    });
});

const cancelRefundRequest = asyncHandler(async (req, res) => {
    const refundRequest = await refundRequestService.cancelRefundRequest({
        id: req.params.id,
        userId: req.user.id,
    });

    ResponseHandler.success(res, {
        message: 'Hủy yêu cầu hoàn tiền thành công',
        data: refundRequest,
    });
});

const processRefundRequest = asyncHandler(async (req, res) => {
    const refundRequest = await refundRequestService.processRefundRequest({
        id: req.params.id,
        adminId: req.user.id,
        status: req.body.status,
        response: req.body.response,
        simulateSuccess: req.body.simulateSuccess,
    });

    ResponseHandler.success(res, {
        message: 'Xử lý yêu cầu hoàn tiền thành công',
        data: refundRequest,
    });
});

const queryRefundStatus = asyncHandler(async (req, res) => {
    const result = await refundRequestService.queryRefundStatus(req.params.id);

    ResponseHandler.success(res, {
        message: 'Truy vấn trạng thái hoàn tiền thành công',
        data: result,
    });
});

module.exports = {
    createRefundRequest,
    getRefundRequests,
    getRefundRequestById,
    getRefundRequestByBooking,
    cancelRefundRequest,
    processRefundRequest,
    queryRefundStatus,
};
