const Joi = require("joi");
const { objectId, paginationQuery } = require("./custom.validator");
const { REVIEW_STATUS } = require("../constants");
const { detectReviewViolation } = require("../utils/reviewModeration");
const messages = require("../constants/messages");

const validateReviewContent = (value, helpers) => {
  if (!value) return value;
  const { isViolation } = detectReviewViolation(value);
  if (isViolation) {
    return helpers.message(messages.REVIEW.VIOLATION);
  }
  return value;
};

const createReview = {
  body: Joi.object().keys({
    movie: Joi.string().required().custom(objectId),
    rating: Joi.number().integer().min(1).max(10).required(),
    content: Joi.string().trim().allow("").max(2000).custom(validateReviewContent),
  }),
};

const updateReview = {
  params: Joi.object().keys({
    id: Joi.string().required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      rating: Joi.number().integer().min(1).max(10),
      content: Joi.string().trim().allow("").max(2000).custom(validateReviewContent),
    })
    .min(1),
};

const getMovieReviews = {
  params: Joi.object().keys({
    movieId: Joi.string().required().custom(objectId),
  }),
  query: Joi.object().keys({
    ...paginationQuery,
    sortBy: Joi.string(),
    select: Joi.string(),
    populate: Joi.string(),
  }),
};

const getReviews = {
  query: Joi.object().keys({
    ...paginationQuery,
    status: Joi.string().valid(...Object.values(REVIEW_STATUS)),
    movie: Joi.string().custom(objectId),
    user: Joi.string().custom(objectId),
    sortBy: Joi.string(),
    select: Joi.string(),
    populate: Joi.string(),
  }),
};

const updateReviewStatus = {
  params: Joi.object().keys({
    id: Joi.string().required().custom(objectId),
  }),
  body: Joi.object().keys({
    status: Joi.string()
      .valid(...Object.values(REVIEW_STATUS))
      .required(),
  }),
};

const deleteReview = {
  params: Joi.object().keys({
    id: Joi.string().required().custom(objectId),
  }),
};

const deleteReviewByAdmin = {
  params: Joi.object().keys({
    id: Joi.string().required().custom(objectId),
  }),
};

module.exports = {
  createReview,
  updateReview,
  getMovieReviews,
  getReviews,
  updateReviewStatus,
  deleteReview,
  deleteReviewByAdmin,
};
