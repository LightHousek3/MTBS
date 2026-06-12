const Joi = require("joi");

const createPromotion = {
  body: Joi.object().keys({
    title: Joi.string().max(255).required(),

    description: Joi.string().allow("", null),

    discountType: Joi.string().valid("AMOUNT", "PERCENT").required(),

    discountValue: Joi.number().positive().required(),

    startDate: Joi.date().required(),

    endDate: Joi.date().greater(Joi.ref("startDate")).required(),

    imageUrl: Joi.string().uri().allow("", null),

    promotionTickets: Joi.object({
      typeSeat: Joi.array().items(
        Joi.string().valid("STANDARD", "VIP", "SWEETBOX"),
      ),
      typeMovie: Joi.array().items(Joi.string().valid("2D", "3D")),
      dayType: Joi.array().items(Joi.string().valid("WEEKDAY", "WEEKEND")),
    }),

    promotionServices: Joi.object({
      typeService: Joi.array().items(
        Joi.string().valid("POPCORN", "DRINK", "COMBO", "OTHER"),
      ),
    }),
  }),
};

const updatePromotion = {
  params: Joi.object().keys({
    promotionId: Joi.string().required(),
  }),

  body: Joi.object()
    .keys({
      title: Joi.string().max(255),

      description: Joi.string().allow("", null),

      discountType: Joi.string().valid("AMOUNT", "PERCENT"),

      discountValue: Joi.number().positive(),

      startDate: Joi.date(),

      endDate: Joi.date(),

      imageUrl: Joi.string().uri().allow("", null),

      promotionTickets: Joi.object({
        typeSeat: Joi.array().items(
          Joi.string().valid("STANDARD", "VIP", "SWEETBOX"),
        ),
        typeMovie: Joi.array().items(Joi.string().valid("2D", "3D")),
        dayType: Joi.array().items(Joi.string().valid("WEEKDAY", "WEEKEND")),
      }),

      promotionServices: Joi.object({
        typeService: Joi.array().items(
          Joi.string().valid("POPCORN", "DRINK", "COMBO", "OTHER"),
        ),
      }),
    })
    .min(1),
};

const getPromotions = {
  query: Joi.object().keys({
    title: Joi.string(),

    status: Joi.string().valid("ACTIVE", "EXPIRED", "UPCOMING"),

    sortBy: Joi.string(),

    limit: Joi.number().integer(),

    page: Joi.number().integer(),
  }),
};

const getPromotion = {
  params: Joi.object().keys({
    promotionId: Joi.string().required(),
  }),
};

const deletePromotion = {
  params: Joi.object().keys({
    promotionId: Joi.string().required(),
  }),
};

module.exports = {
  createPromotion,
  updatePromotion,
  getPromotions,
  getPromotion,
  deletePromotion,
};
