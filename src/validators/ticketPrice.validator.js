const Joi = require("joi");
const { idParam, paginationQuery } = require("./custom.validator");

const createTicketPrice = {
  body: Joi.object().keys({
    typeSeat: Joi.string().valid("STANDARD", "VIP", "SWEETBOX").required(),
    typeMovie: Joi.string().valid("2D", "3D").required(),
    price: Joi.number().min(1).required(),
    dayType: Joi.string().valid("WEEKDAY", "WEEKEND").required(),
    startTime: Joi.string()
      .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .required(),
    endTime: Joi.string()
      .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .required(),
  }),
};

const updateTicketPrice = {
  ...idParam,
  body: Joi.object()
    .keys({
      typeSeat: Joi.string().valid("STANDARD", "VIP", "SWEETBOX"),
      typeMovie: Joi.string().valid("2D", "3D"),
      price: Joi.number().min(1),
      dayType: Joi.string().valid("WEEKDAY", "WEEKEND"),
      startTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
      endTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
    })
    .min(1),
};

const getTicketPrice = idParam;

const deleteTicketPrice = idParam;

module.exports = {
  createTicketPrice,
  updateTicketPrice,
  getTicketPrice,
  deleteTicketPrice,
};
