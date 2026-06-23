const Joi = require('joi');
const { REDEEM_STATUS, REDEEMGIFT_STATUS } = require('../constants');
const { objectId, paginationQuery, phoneNumber } = require('./custom.validator');

const ALL_STATUS_VALUE = 'ALL';

const imageSchema = Joi.object({
    url: Joi.string().uri().required(),
    publicId: Joi.string().allow('').optional(),
}).allow(null);

const createRedeem = {
    body: Joi.object().keys({
        name: Joi.string().trim().min(1).max(255).required().messages({
            'any.required': 'Tên phần quà là bắt buộc',
            'string.empty': 'Tên phần quà không được để trống',
            'string.max': 'Tên phần quà không được vượt quá 255 ký tự',
        }),
        description: Joi.string().trim().max(255).allow('').default('').messages({
            'string.max': 'Mô tả không được vượt quá 255 ký tự',
        }),
        pointsRequired: Joi.number().integer().min(1).required().messages({
            'any.required': 'Điểm yêu cầu là bắt buộc',
            'number.min': 'Điểm yêu cầu tối thiểu phải là 1',
            'number.base': 'Điểm yêu cầu phải là số',
        }),
        image: imageSchema.optional(),
        quantity: Joi.number().integer().min(1).default(1).messages({
            'number.min': 'Số lượng tối thiểu phải là 1',
            'number.base': 'Số lượng phải là số',
        }),
        status: Joi.string().valid(...Object.values(REDEEM_STATUS)),
    }),
};

const updateRedeem = {
    params: Joi.object().keys({
        id: Joi.string().required().custom(objectId),
    }),
    body: Joi.object()
        .keys({
            name: Joi.string().trim().min(1).max(255).messages({
                'string.empty': 'Tên phần quà không được để trống',
                'string.max': 'Tên phần quà không được vượt quá 255 ký tự',
            }),
            description: Joi.string().trim().max(255).allow('').messages({
                'string.max': 'Mô tả không được vượt quá 255 ký tự',
            }),
            pointsRequired: Joi.number().integer().min(1).messages({
                'number.min': 'Điểm yêu cầu tối thiểu phải là 1',
                'number.base': 'Điểm yêu cầu phải là số',
            }),
            image: imageSchema.optional(),
            quantity: Joi.number().integer().min(1).messages({
                'number.min': 'Số lượng tối thiểu phải là 1',
                'number.base': 'Số lượng phải là số',
            }),
            status: Joi.string().valid(...Object.values(REDEEM_STATUS)),
        })
        .min(1),
};

const getRedeems = {
    query: Joi.object().keys({
        ...paginationQuery,
        search: Joi.string().trim().allow(''),
        status: Joi.string().valid(...Object.values(REDEEM_STATUS), ALL_STATUS_VALUE),
    }),
};

const getRedeem = {
    params: Joi.object().keys({
        id: Joi.string().required().custom(objectId),
    }),
};

const deleteRedeem = getRedeem;

const redeemGift = {
    params: Joi.object().keys({
        id: Joi.string().required().custom(objectId),
    }),
    body: Joi.object().keys({
        amount: Joi.number().integer().min(1).default(1),
        address: Joi.string().trim().max(255).allow('').default(''),
        phone: Joi.string().trim().required().custom(phoneNumber),
    }),
};

const createRedeemGift = {
    body: Joi.object().keys({
        user: Joi.string().required().custom(objectId),
        redeem: Joi.string().required().custom(objectId),
        transactionNo: Joi.string().trim(),
        amount: Joi.number().integer().min(1).default(1),
        address: Joi.string().trim().max(255).allow('').default(''),
        phone: Joi.string().trim().required().custom(phoneNumber),
        expectedDeliveryDate: Joi.date(),
        status: Joi.string().valid(...Object.values(REDEEMGIFT_STATUS)),
    }),
};

const updateRedeemGift = {
    params: Joi.object().keys({
        id: Joi.string().required().custom(objectId),
    }),
    body: Joi.object()
        .keys({
            expectedDeliveryDate: Joi.date(),
            status: Joi.string().valid(...Object.values(REDEEMGIFT_STATUS)),
        })
        .min(1),
};

const getRedeemGifts = {
    query: Joi.object().keys({
        ...paginationQuery,
        status: Joi.string().valid(...Object.values(REDEEMGIFT_STATUS), ALL_STATUS_VALUE),
        user: Joi.string().custom(objectId),
        redeem: Joi.string().custom(objectId),
        transactionNo: Joi.string().trim().allow(''),
        populate: Joi.string(),
    }),
};

const getMyRedeemGiftHistory = {
    query: Joi.object().keys({
        ...paginationQuery,
        status: Joi.string().valid(...Object.values(REDEEMGIFT_STATUS), ALL_STATUS_VALUE),
        redeem: Joi.string().custom(objectId),
        transactionNo: Joi.string().trim().allow(''),
        populate: Joi.string(),
    }),
};

const getRedeemGift = {
    params: Joi.object().keys({
        id: Joi.string().required().custom(objectId),
    }),
};

const deleteRedeemGift = getRedeemGift;

const cancelRedeemGift = getRedeemGift;

module.exports = {
    createRedeem,
    updateRedeem,
    getRedeems,
    getRedeem,
    deleteRedeem,
    redeemGift,
    createRedeemGift,
    updateRedeemGift,
    getRedeemGifts,
    getMyRedeemGiftHistory,
    getRedeemGift,
    cancelRedeemGift,
    deleteRedeemGift,
};
