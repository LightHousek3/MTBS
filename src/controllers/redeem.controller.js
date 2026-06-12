const { redeemService } = require('../services');
const { asyncHandler, ResponseHandler, pick } = require('../utils');
const { messages, USER_ROLE } = require('../constants');

const createRedeem = asyncHandler(async (req, res) => {
    const redeem = await redeemService.createRedeem(req.body);
    ResponseHandler.created(res, {
        message: messages.CRUD.CREATED('Redeem'),
        data: redeem,
    });
});

const getRedeems = asyncHandler(async (req, res) => {
    const filter = pick(req.query, ['search', 'status']);
    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    const result = await redeemService.getRedeems(filter, options, {
        includeInactive: req.user?.role === USER_ROLE.ADMIN,
    });

    ResponseHandler.paginated(res, {
        message: messages.CRUD.LIST_FETCHED('Redeems'),
        data: result.results,
        meta: result.meta,
    });
});

const getRedeem = asyncHandler(async (req, res) => {
    const redeem = await redeemService.getRedeemById(req.params.id, {
        includeInactive: req.user?.role === USER_ROLE.ADMIN,
    });
    ResponseHandler.success(res, {
        message: messages.CRUD.FETCHED('Redeem'),
        data: redeem,
    });
});

const updateRedeem = asyncHandler(async (req, res) => {
    const redeem = await redeemService.updateRedeemById(req.params.id, req.body);
    ResponseHandler.success(res, {
        message: messages.CRUD.UPDATED('Redeem'),
        data: redeem,
    });
});

const deleteRedeem = asyncHandler(async (req, res) => {
    const status = await redeemService.deleteRedeemById(req.params.id);
    ResponseHandler.success(res, {
        message: messages.CRUD.DELETED('Redeem'),
        data: { status },
    });
});

const redeemGift = asyncHandler(async (req, res) => {
    const redeemGift = await redeemService.redeemGift({
        userId: req.user.id,
        redeemId: req.params.id,
        amount: req.body.amount,
        address: req.body.address,
    });

    ResponseHandler.created(res, {
        message: 'Đổi quà thành công',
        data: redeemGift,
    });
});

module.exports = {
    createRedeem,
    getRedeems,
    getRedeem,
    updateRedeem,
    deleteRedeem,
    redeemGift,
};
