const { LoyaltyTransaction, Redeem, RedeemGift, User } = require('../models');
const { ApiError } = require('../utils');
const {
    LOYALTY_TRANSACTION_TYPE,
    messages,
    REDEEM_STATUS,
    REDEEMGIFT_STATUS,
} = require('../constants');

const ALL_STATUS_VALUE = 'ALL';

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildRedeemFilter = (filter = {}) => {
    const query = {};

    const searchText = filter.search?.trim();
    if (searchText) {
        const search = escapeRegExp(searchText);
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
        ];
    }

    if (filter.status && filter.status !== ALL_STATUS_VALUE) {
        query.status = filter.status;
    }

    return query;
};

const applyCustomerRedeemVisibility = (query, includeInactive = false) => {
    if (!includeInactive) {
        query.status = REDEEM_STATUS.AVAILABLE;
    }

    return query;
};

const buildRedeemGiftFilter = (filter = {}) => {
    const query = {};

    if (filter.status && filter.status !== ALL_STATUS_VALUE) {
        query.status = filter.status;
    }

    if (filter.user) {
        query.user = filter.user;
    }

    if (filter.redeem) {
        query.redeem = filter.redeem;
    }

    const transactionNo = filter.transactionNo?.trim();
    if (transactionNo) {
        query.transactionNo = { $regex: escapeRegExp(transactionNo), $options: 'i' };
    }

    return query;
};

const generateTransactionNo = () =>
    `RD${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

const addDays = (date, days) => {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
};

const createRedeem = async (body) => {
    const existing = await Redeem.findOne({
        name: { $regex: `^${escapeRegExp(body.name.trim())}$`, $options: 'i' },
    });

    if (existing) {
        throw ApiError.conflict(messages.CRUD.ALREADY_EXISTS('Redeem'));
    }

    return Redeem.create(body);
};

const getRedeems = async (filter, options, { includeInactive = false } = {}) =>
    Redeem.paginate(
        applyCustomerRedeemVisibility(buildRedeemFilter(filter), includeInactive),
        options,
    );

const getRedeemById = async (id, { includeInactive = true } = {}) => {
    const query = applyCustomerRedeemVisibility({ _id: id }, includeInactive);
    const redeem = await Redeem.findOne(query);

    if (!redeem) {
        throw ApiError.notFound(messages.CRUD.NOT_FOUND('Redeem'));
    }

    return redeem;
};

const updateRedeemById = async (id, updateBody) => {
    const redeem = await getRedeemById(id);

    if (updateBody.name) {
        const existing = await Redeem.findOne({
            _id: { $ne: id },
            name: { $regex: `^${escapeRegExp(updateBody.name.trim())}$`, $options: 'i' },
        });

        if (existing) {
            throw ApiError.conflict(messages.CRUD.ALREADY_EXISTS('Redeem'));
        }
    }

    Object.assign(redeem, updateBody);
    await redeem.save();
    return redeem;
};

const deleteRedeemById = async (id) => {
    await getRedeemById(id);
    const redeemGiftCount = await RedeemGift.countDocuments({ redeem: id });

    if (redeemGiftCount > 0) {
        throw ApiError.conflict('Khong the xoa qua da co giao dich doi qua');
    }

    return Redeem.softDeleteById(id);
};

const redeemGift = async ({ userId, redeemId, amount = 1, address = '', phone }) => {
    const normalizedAmount = Number(amount);

    if (!Number.isInteger(normalizedAmount) || normalizedAmount < 1) {
        throw ApiError.badRequest('Số lượng quà đổi không hợp lệ');
    }

    const [user, redeem] = await Promise.all([User.findById(userId), Redeem.findById(redeemId)]);

    if (!user) {
        throw ApiError.notFound(messages.CRUD.NOT_FOUND('User'));
    }

    if (!redeem || redeem.status !== REDEEM_STATUS.AVAILABLE) {
        throw ApiError.badRequest('Quà đổi điểm không khả dụng');
    }

    if (redeem.quantity < normalizedAmount) {
        throw ApiError.badRequest('Số lượng quà không đủ');
    }

    const totalPoints = redeem.pointsRequired * normalizedAmount;
    if (user.loyaltyPoints < totalPoints) {
        throw ApiError.badRequest('Điểm tích lũy không đủ để đổi quà');
    }

    const balanceBefore = user.loyaltyPoints;
    user.loyaltyPoints -= totalPoints;
    const balanceAfter = user.loyaltyPoints;
    redeem.quantity -= normalizedAmount;

    if (redeem.quantity === 0) {
        redeem.status = REDEEM_STATUS.INACTIVE;
    }

    await Promise.all([user.save(), redeem.save()]);

    const transactionNo = generateTransactionNo();
    const gift = await RedeemGift.create({
        user: user._id,
        redeem: redeem._id,
        amount: normalizedAmount,
        address,
        phone,
        expectedDeliveryDate: addDays(new Date(), 14),
        transactionNo,
        status: REDEEMGIFT_STATUS.PENDING,
    });

    await LoyaltyTransaction.create({
        user: user._id,
        type: LOYALTY_TRANSACTION_TYPE.SPEND,
        points: totalPoints,
        balanceBefore,
        balanceAfter,
        description: `Doi ${normalizedAmount} qua "${redeem.name}" - ${transactionNo}`,
    });

    return RedeemGift.findById(gift._id).populate('user').populate('redeem');
};

const createRedeemGift = async (body) => {
    const [user, redeem] = await Promise.all([
        User.findById(body.user).select('_id'),
        Redeem.findById(body.redeem).select('_id'),
    ]);

    if (!user) {
        throw ApiError.notFound(messages.CRUD.NOT_FOUND('User'));
    }

    if (!redeem) {
        throw ApiError.notFound(messages.CRUD.NOT_FOUND('Redeem'));
    }

    const transactionNo = body.transactionNo || generateTransactionNo();
    return RedeemGift.create({
        ...body,
        transactionNo,
        expectedDeliveryDate:
            body.expectedDeliveryDate || addDays(new Date(), 14),
    });
};

const getRedeemGifts = async (filter, options) => {
    const normalizedOptions = {
        ...options,
        populate: options.populate || 'user,redeem',
    };

    return RedeemGift.paginate(buildRedeemGiftFilter(filter), normalizedOptions);
};

const getMyRedeemGiftHistory = async (userId, filter, options) => {
    const normalizedOptions = {
        ...options,
        populate: options.populate || 'redeem',
    };

    return RedeemGift.paginate(
        buildRedeemGiftFilter({
            ...filter,
            user: userId,
        }),
        normalizedOptions,
    );
};

const getRedeemGiftById = async (id) => {
    const redeemGift = await RedeemGift.findById(id).populate('user').populate('redeem');

    if (!redeemGift) {
        throw ApiError.notFound(messages.CRUD.NOT_FOUND('Redeem Gift'));
    }

    return redeemGift;
};

const ensureRedeemGiftStatusTransitionAllowed = (currentStatus, nextStatus) => {
    if (!nextStatus || nextStatus === currentStatus) {
        return;
    }

    const allowedTransitions = {
        [REDEEMGIFT_STATUS.PENDING]: [REDEEMGIFT_STATUS.DELIVERING],
        [REDEEMGIFT_STATUS.DELIVERING]: [REDEEMGIFT_STATUS.DELIVERED],
        [REDEEMGIFT_STATUS.DELIVERED]: [],
        [REDEEMGIFT_STATUS.CANCELLED]: [],
    };

    if (!allowedTransitions[currentStatus]?.includes(nextStatus)) {
        throw ApiError.badRequest('Trang thai giao dich doi qua khong hop le');
    }
};

const updateRedeemGiftById = async (id, updateBody) => {
    const redeemGift = await getRedeemGiftById(id);
    const allowedUpdateBody = {};

    if (Object.prototype.hasOwnProperty.call(updateBody, 'status')) {
        ensureRedeemGiftStatusTransitionAllowed(redeemGift.status, updateBody.status);
        allowedUpdateBody.status = updateBody.status;
    }

    if (Object.prototype.hasOwnProperty.call(updateBody, 'expectedDeliveryDate')) {
        allowedUpdateBody.expectedDeliveryDate = updateBody.expectedDeliveryDate;
    }

    if (Object.keys(allowedUpdateBody).length === 0) {
        throw ApiError.badRequest('Khong co truong hop le de cap nhat giao dich doi qua');
    }

    Object.assign(redeemGift, allowedUpdateBody);
    await redeemGift.save();
    return getRedeemGiftById(id);
};

const cancelRedeemGiftByCustomer = async (id, userId) => {
    const redeemGift = await RedeemGift.findOne({ _id: id, user: userId });

    if (!redeemGift) {
        throw ApiError.notFound(messages.CRUD.NOT_FOUND('Redeem Gift'));
    }

    if (redeemGift.status !== REDEEMGIFT_STATUS.PENDING) {
        throw ApiError.badRequest('Chi co the huy giao dich doi qua dang cho xu ly');
    }

    const [user, redeem, spendTransaction] = await Promise.all([
        User.findById(userId),
        Redeem.findById(redeemGift.redeem),
        LoyaltyTransaction.findOne({
            user: userId,
            type: LOYALTY_TRANSACTION_TYPE.SPEND,
            description: { $regex: escapeRegExp(redeemGift.transactionNo), $options: 'i' },
        }).sort({ createdAt: -1 }),
    ]);

    if (!user) {
        throw ApiError.notFound(messages.CRUD.NOT_FOUND('User'));
    }

    if (!redeem) {
        throw ApiError.notFound(messages.CRUD.NOT_FOUND('Redeem'));
    }

    const refundPoints = spendTransaction
        ? spendTransaction.points
        : redeem.pointsRequired * redeemGift.amount;
    const balanceBefore = user.loyaltyPoints;
    user.loyaltyPoints += refundPoints;
    const balanceAfter = user.loyaltyPoints;

    redeemGift.status = REDEEMGIFT_STATUS.CANCELLED;
    redeem.quantity += redeemGift.amount;

    if (redeem.quantity > 0 && redeem.status === REDEEM_STATUS.INACTIVE) {
        redeem.status = REDEEM_STATUS.AVAILABLE;
    }

    await Promise.all([redeemGift.save(), user.save(), redeem.save()]);

    await LoyaltyTransaction.create({
        user: user._id,
        type: LOYALTY_TRANSACTION_TYPE.REFUND,
        points: refundPoints,
        balanceBefore,
        balanceAfter,
        description: `Hoan diem huy doi qua "${redeem.name}" - ${redeemGift.transactionNo}`,
    });

    return getRedeemGiftById(id);
};

const deleteRedeemGiftById = async (id) => {
    await getRedeemGiftById(id);
    return RedeemGift.softDeleteById(id);
};

module.exports = {
    createRedeem,
    getRedeems,
    getRedeemById,
    updateRedeemById,
    deleteRedeemById,
    redeemGift,
    createRedeemGift,
    getRedeemGifts,
    getMyRedeemGiftHistory,
    getRedeemGiftById,
    updateRedeemGiftById,
    cancelRedeemGiftByCustomer,
    deleteRedeemGiftById,
};
