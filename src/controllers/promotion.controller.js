const { promotionService } = require('../services');
const { asyncHandler, ResponseHandler, pick } = require('../utils');
const { messages } = require('../constants');

/**
 * Create promotion
 */
const createPromotion = asyncHandler(async (req, res) => {
    const promotion = await promotionService.createPromotion(req.body);

    ResponseHandler.created(res, {
        message: messages.CRUD.CREATED('Promotion'),
        data: promotion,
    });
});

/**
 * Get list promotions
 */
const getPromotions = asyncHandler(async (req, res) => {
    const filter = {};
    const options = pick(req.query, ['sortBy', 'limit', 'page']);

    const result = await promotionService.queryPromotions(filter, options);

    ResponseHandler.paginated(res, {
        message: messages.CRUD.LIST_FETCHED('Promotions'),
        data: result.results,
        meta: result.meta,
    });
});

/**
 * Get promotion detail
 */
const getPromotion = asyncHandler(async (req, res) => {
    const promotion = await promotionService.getPromotionById(req.params.promotionId);

    ResponseHandler.success(res, {
        message: messages.CRUD.FETCHED('Promotion'),
        data: promotion,
    });
});

/**
 * Update promotion
 */
const updatePromotion = asyncHandler(async (req, res) => {
    const promotion = await promotionService.updatePromotionById(
        req.params.promotionId,
        req.body
    );

    ResponseHandler.success(res, {
        message: messages.CRUD.UPDATED('Promotion'),
        data: promotion,
    });
});

/**
 * Delete promotion
 */
const deletePromotion = asyncHandler(async (req, res) => {
    await promotionService.deletePromotionById(req.params.promotionId);

    ResponseHandler.success(res, {
        message: messages.CRUD.DELETED('Promotion'),
    });
});

module.exports = {
    createPromotion,
    getPromotions,
    getPromotion,
    updatePromotion,
    deletePromotion,
};