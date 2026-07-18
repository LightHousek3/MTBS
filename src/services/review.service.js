const { Review, Booking, Showtime, Movie } = require("../models");
const { ApiError } = require("../utils");
const { moderateReviewContent } = require("./moderation.service");
const { messages, BOOKING_STATUS, REVIEW_STATUS } = require("../constants");

const ensureReviewPreconditions = async (userId, movieId) => {
  const movie = await Movie.findById(movieId);
  if (!movie) {
    throw ApiError.notFound(messages.CRUD.NOT_FOUND("Movie"));
  }
  const existing = await Review.findOne({ user: userId, movie: movieId });
  if (existing) {
    throw ApiError.conflict(messages.REVIEW.ALREADY_REVIEWED);
  }
  const now = new Date();

  // 1. Lấy tất cả suất chiếu của phim
  const showtimes = await Showtime.find({ movie: movieId }).select("_id endTime");
  const showtimeIds = showtimes.map((showtime) => showtime._id);

  // 2. Kiểm tra xem user có vé nào cho phim này chưa (chưa cần biết kết thúc hay chưa)
  const booking = await Booking.findOne({
    user: userId,
    status: BOOKING_STATUS.CONFIRMED,
    showtime: { $in: showtimeIds },
  }).select("_id");

  if (!booking) {
    throw ApiError.badRequest(messages.REVIEW.NOT_ELIGIBLE);
  }

  // 3. Nếu đã có vé, kiểm tra xem suất chiếu CỦA NHỮNG VÉ ĐÓ đã kết thúc chưa
  const endedShowtimeIds = showtimes
    .filter((showtime) => showtime.endTime < now)
    .map((showtime) => showtime._id);

  const endedBooking = await Booking.findOne({
    user: userId,
    status: BOOKING_STATUS.CONFIRMED,
    showtime: { $in: endedShowtimeIds },
  }).select("_id");

  if (!endedBooking) {
    throw ApiError.badRequest(messages.REVIEW.SHOWTIME_NOT_ENDED);
  }

  return endedBooking;
};

const createReview = async (userId, body) => {
  const { movie: movieId, rating, content } = body;

  await ensureReviewPreconditions(userId, movieId);

  const moderation = await moderateReviewContent(content ?? "");

  return Review.create({
    user: userId,
    movie: movieId,
    rating,
    content: content ?? "",
    status: moderation.status,
    riskScore: moderation.riskScore,
    aiScores: moderation.aiScores,
  });
};

const getMyReviewForMovie = async (userId, movieId) => {
  const review = await Review.findOne({ user: userId, movie: movieId });
  return review || null;
};

const getMovieReviews = async (movieId, options) => {
  const movie = await Movie.findById(movieId);
  if (!movie) {
    throw ApiError.notFound(messages.CRUD.NOT_FOUND("Movie"));
  }
  const filter = { movie: movieId, status: REVIEW_STATUS.APPROVED };
  return Review.paginate(filter, options);
};

const getReviews = async (filter, options) => {
  const query = {};

  if (filter.status) query.status = filter.status;
  if (filter.movie) query.movie = filter.movie;
  if (filter.user) query.user = filter.user;

  return Review.paginate(query, options);
};

const updateReviewById = async (reviewId, userId, updateBody) => {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw ApiError.notFound(messages.CRUD.NOT_FOUND("Review"));
  }

  if (String(review.user) !== String(userId)) {
    throw ApiError.forbidden(messages.REVIEW.NOT_OWNER);
  }

  if (updateBody.rating !== undefined) {
    review.rating = updateBody.rating;
  }

  if (updateBody.content !== undefined) {
    const moderation = await moderateReviewContent(updateBody.content ?? "");
    review.content = updateBody.content;
    review.status = moderation.status;
    review.riskScore = moderation.riskScore;
    review.aiScores = moderation.aiScores;
  }

  await review.save();
  return review;
};

const updateReviewStatus = async (reviewId, status) => {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw ApiError.notFound(messages.CRUD.NOT_FOUND("Review"));
  }

  if (review.status === REVIEW_STATUS.APPROVED && status === REVIEW_STATUS.REJECTED) {
    throw ApiError.badRequest("Cannot reject an already approved review");
  }

  review.status = status;
  await review.save();
  return review;
};

const deleteReviewById = async (reviewId, userId) => {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw ApiError.notFound(messages.CRUD.NOT_FOUND("Review"));
  }

  if (String(review.user) !== String(userId)) {
    throw ApiError.forbidden(messages.REVIEW.NOT_OWNER);
  }
  await review.softDelete();
  return review;
};

const deleteReviewByAdmin = async (reviewId) => {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw ApiError.notFound(messages.CRUD.NOT_FOUND("Review"));
  }

  await review.softDelete();
  return review;
};

module.exports = {
  createReview,
  getMovieReviews,
  getMyReviewForMovie,
  getReviews,
  updateReviewById,
  updateReviewStatus,
  deleteReviewById,
  deleteReviewByAdmin,
};
