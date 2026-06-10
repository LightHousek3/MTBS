const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require('../../src/middlewares');
const { USER_ROLE } = require('../../src/constants');

const promotionController = require("../controllers/promotion.controller");
const promotionValidator = require("../validators/promotion.validator");

const validate = require("../middlewares/validate.middleware");

router.post(
  "/",
  authenticate,
  authorize(USER_ROLE.ADMIN),
  validate(promotionValidator.createPromotion),
  promotionController.createPromotion,
);

router.get(
  "/",
  validate(promotionValidator.getPromotions),
  promotionController.getPromotions,
);

router.get(
  "/:promotionId",
  validate(promotionValidator.getPromotion),
  promotionController.getPromotion,
);

router.patch(
  "/:promotionId",
  authenticate,
  authorize(USER_ROLE.ADMIN),
  validate(promotionValidator.updatePromotion),
  promotionController.updatePromotion,
);

router.delete(
  "/:promotionId",
  authenticate,
  authorize(USER_ROLE.ADMIN),
  validate(promotionValidator.deletePromotion),
  promotionController.deletePromotion,
);

module.exports = router;
