const httpStatus = require("../constants/httpStatus");
const { Promotion } = require("../models");
const ApiError = require("../utils/ApiError");
const logger = require("../config/logger");

const checkPromotionOverlap = async (startDate, endDate, excludeId = null) => {
  const query = {
    startDate: { $lt: new Date(endDate) },
    endDate: { $gt: new Date(startDate) },
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const existingPromotion = await Promotion.findOne(query);

  if (existingPromotion) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Promotion time overlaps with an existing promotion",
    );
  }
};

const calculateStatus = (startDate, endDate) => {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  logger.debug(`nowdate : ${now.toISOString()}`);
  logger.debug(`startday : ${start.toISOString()}`);
  logger.debug(`enddate : ${end.toISOString()}`);

  if (now < start) return "UPCOMING";
  if (now >= start && now <= end) return "ACTIVE";
  return "EXPIRED";
};

const autoUpdateStatus = async (promotion) => {
  const newStatus = calculateStatus(promotion.startDate, promotion.endDate);
  if (promotion.status !== newStatus) {
    promotion.status = newStatus;
    await promotion.save();
  }
  return promotion;
};

const createPromotion = async (promotionBody) => {
  await checkPromotionOverlap(promotionBody.startDate, promotionBody.endDate);
  promotionBody.status = calculateStatus(
    promotionBody.startDate,
    promotionBody.endDate,
  );
  const promotion = await Promotion.create(promotionBody);
  return promotion;
};

const queryPromotions = async (filter, options) => {
  const promotions = await Promotion.paginate(filter, options);
  await Promise.all(promotions.results.map((p) => autoUpdateStatus(p)));
  return promotions;
};

const getPromotionById = async (id) => {
  const promotion = await Promotion.findById(id);
  if (!promotion) {
    throw new ApiError(httpStatus.NOT_FOUND, "Promotion not found");
  }
  return autoUpdateStatus(promotion);
};

const updatePromotionById = async (promotionId, updateBody) => {
  const promotion = await getPromotionById(promotionId);

  if (updateBody.startDate || updateBody.endDate) {
    const startDate = updateBody.startDate || promotion.startDate;
    const endDate = updateBody.endDate || promotion.endDate;
    await checkPromotionOverlap(startDate, endDate, promotionId);
    updateBody.status = calculateStatus(startDate, endDate);
  }

  Object.assign(promotion, updateBody);
  await promotion.save();
  return promotion;
};

const deletePromotionById = async (promotionId) => {
  const deleted = await Promotion.softDeleteById(promotionId);
  if (!deleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Promotion not found');
  }
  return { success: true };
};

module.exports = {
  createPromotion,
  queryPromotions,
  getPromotionById,
  updatePromotionById,
  deletePromotionById,
};
