const Joi = require('joi');
const { messages } = require('../constants');

const createSeat = {
  body: Joi.object().keys({
    screenId: Joi.string()
      .required()
      .messages({
        "any.required": messages.VALIDATION.REQUIRED_FIELD("screenId"),
      }),

    seatNumber: Joi.string()
      .max(50)
      .required()
      .messages({
        "any.required": messages.VALIDATION.REQUIRED_FIELD("seatNumber"),
      }),

    type: Joi.string().valid("STANDARD", "VIP", "SWEETBOX").default("STANDARD"),

    status: Joi.string().valid("AVAILABLE", "UNAVAILABLE").default("AVAILABLE"),
  }),
};

const getSeats = {
  query: Joi.object().keys({
    screenId: Joi.string(),

    sortBy: Joi.string(),

    limit: Joi.number().integer(),

    page: Joi.number().integer(),
  }),
};

const getSeat = {
  params: Joi.object().keys({
    id: Joi.string()
      .required()
      .messages({
        "any.required": messages.VALIDATION.REQUIRED_FIELD("id"),
      }),
  }),
};

const updateSeat = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),

  body: Joi.object()
    .keys({
      seatNumber: Joi.string().max(50),

      type: Joi.string().valid("STANDARD", "VIP", "SWEETBOX"),

      status: Joi.string().valid("AVAILABLE", "UNAVAILABLE"),
    })
    .min(1),
};

const deleteSeat = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
};

const updateSeatStatus = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),

  body: Joi.object().keys({
    status: Joi.string().valid("AVAILABLE", "UNAVAILABLE").required(),
  }),
};

const createSeatsBulk = {
  body: Joi.object().keys({
    screenId: Joi.string().required(),
    seats: Joi.array().items(
      Joi.object().keys({
        seatNumber: Joi.string().max(50).required(),
        type: Joi.string().valid("STANDARD", "VIP", "SWEETBOX").default("STANDARD"),
        status: Joi.string().valid("AVAILABLE", "UNAVAILABLE").default("AVAILABLE"),
      })
    ).min(1).required(),
  }).unknown(true),
};

const updateSeatsBulk = {
  body: Joi.object().keys({
    screenId: Joi.string().required(),
    updates: Joi.array().items(
      Joi.object().keys({
        seatNumber: Joi.string().required(),
        updateBody: Joi.object().keys({
          seatNumber: Joi.string().max(50),
          type: Joi.string().valid("STANDARD", "VIP", "SWEETBOX"),
          status: Joi.string().valid("AVAILABLE", "UNAVAILABLE"),
        }).min(1).required(),
      })
    ).min(1).required(),
  }).unknown(true),
};

const deleteSeatsBulk = {
  body: Joi.object().keys({
    screenId: Joi.string().required(),
    seatNumbers: Joi.array().items(Joi.string()).min(1).required(),
  }).unknown(true),
};

module.exports = {
  createSeat,
  getSeats,
  getSeat,
  updateSeat,
  deleteSeat,
  updateSeatStatus,
  createSeatsBulk,
  updateSeatsBulk,
  deleteSeatsBulk,
};
