const { redeemService } = require('../services');
const { asyncHandler, ResponseHandler, pick } = require('../utils');
const { messages } = require('../constants');

const createRedeemGift = asyncHandler(async (req, res) => {
    const redeemGift = await redeemService.createRedeemGift(req.body);
    ResponseHandler.created(res, {
        message: messages.CRUD.CREATED('Redeem Gift'),
        data: redeemGift,
    });
});

const getRedeemGifts = asyncHandler(async (req, res) => {
    const filter = pick(req.query, ['status', 'user', 'redeem', 'transactionNo']);
    const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);
    const result = await redeemService.getRedeemGifts(filter, options);

    ResponseHandler.paginated(res, {
        message: messages.CRUD.LIST_FETCHED('Redeem Gifts'),
        data: result.results,
        meta: result.meta,
    });
});

const getMyRedeemGiftHistory = asyncHandler(async (req, res) => {
    const filter = pick(req.query, ['status', 'redeem', 'transactionNo']);
    const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);
    const result = await redeemService.getMyRedeemGiftHistory(req.user.id, filter, options);

    ResponseHandler.paginated(res, {
        message: messages.CRUD.LIST_FETCHED('Redeem Gift History'),
        data: result.results,
        meta: result.meta,
    });
});

const getRedeemGift = asyncHandler(async (req, res) => {
    const redeemGift = await redeemService.getRedeemGiftById(req.params.id);
    ResponseHandler.success(res, {
        message: messages.CRUD.FETCHED('Redeem Gift'),
        data: redeemGift,
    });
});

const updateRedeemGift = asyncHandler(async (req, res) => {
    const redeemGift = await redeemService.updateRedeemGiftById(req.params.id, req.body);
    ResponseHandler.success(res, {
        message: messages.CRUD.UPDATED('Redeem Gift'),
        data: redeemGift,
    });
});

const cancelMyRedeemGift = asyncHandler(async (req, res) => {
    const redeemGift = await redeemService.cancelRedeemGiftByCustomer(req.params.id, req.user.id);
    ResponseHandler.success(res, {
        message: 'Huy giao dich doi qua thanh cong',
        data: redeemGift,
    });
});

const deleteRedeemGift = asyncHandler(async (req, res) => {
    const status = await redeemService.deleteRedeemGiftById(req.params.id);
    ResponseHandler.success(res, {
        message: messages.CRUD.DELETED('Redeem Gift'),
        data: { status },
    });
});

module.exports = {
    createRedeemGift,
    getRedeemGifts,
    getMyRedeemGiftHistory,
    getRedeemGift,
    updateRedeemGift,
    cancelMyRedeemGift,
    deleteRedeemGift,
};
