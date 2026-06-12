const Joi = require("joi");
const { SHOWTIME_STATUS } = require("../constants");

const createShowtime = {
  body: Joi.object().keys({
    startTime: Joi.date().required(),

    endTime: Joi.date().greater(Joi.ref("startTime")).required().messages({
      "date.greater": "endTime must be greater than startTime",
    }),

    movie: Joi.string().hex().length(24).required(),

    screen: Joi.string().hex().length(24).required(),
  }),
};

const updateShowtime = {
  params: Joi.object().keys({
    id: Joi.string().hex().length(24).required(),
  }),

  body: Joi.object()
    .keys({
      startTime: Joi.date(),

      endTime: Joi.date(),

      movie: Joi.string().hex().length(24),

      screen: Joi.string().hex().length(24),
    })
    .custom((value, helpers) => {
      if (value.startTime && value.endTime && !(value.startTime < value.endTime)) {
        return helpers.message("endTime must be greater than startTime");
      }

      return value;
    })
    .min(1),
};

const deleteShowtime = {
  params: Joi.object().keys({
    id: Joi.string().hex().length(24).required(),
  }),
};

const getShowtime = {
  params: Joi.object().keys({
    id: Joi.string().hex().length(24).required(),
  }),
  query: Joi.object().keys({
    populate: Joi.string(),
  }),
};

const getShowtimes = {
  query: Joi.object().keys({
    movie: Joi.string().hex().length(24),
    theaterId: Joi.string().hex().length(24),
    status: Joi.string().valid(...Object.values(SHOWTIME_STATUS)),
    date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
    startTime: Joi.date(),
    endTime: Joi.date(),
    location: Joi.string(),
    // Backward compatibility alias; prefer theaterId.
    theater: Joi.string().hex().length(24),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    populate: Joi.string(),
  }),
};

module.exports = {
  createShowtime,
  getShowtime,
  getShowtimes,
  updateShowtime,
  deleteShowtime,
};
