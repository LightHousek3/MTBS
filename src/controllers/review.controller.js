const { reviewService } = require("../services");
const { asyncHandler, ResponseHandler, pick } = require("../utils");
const { messages } = require("../constants");

const createReview = asyncHandler(async (req, res) => {
  const review = await reviewService.createReview(req.user.id, req.body);
  
  let message = messages.CRUD.CREATED("Review");
  if (review.status === "PENDING") {
    message = messages.REVIEW.PENDING_MODERATION;
  }

  ResponseHandler.created(res, {
    message: message,
    data: review,
  });
});

const getMovieReviews = asyncHandler(async (req, res) => {
  const options = pick(req.query, [
    "sortBy",
    "limit",
    "page",
    "select",
    "populate",
  ]);
  const result = await reviewService.getMovieReviews(
    req.params.movieId,
    options,
  );

  ResponseHandler.paginated(res, {
    message: messages.CRUD.LIST_FETCHED("Reviews"),
    data: result.results,
    meta: result.meta,
  });
});

const getMyReviewForMovie = asyncHandler(async (req, res) => {
  const review = await reviewService.getMyReviewForMovie(
    req.user.id,
    req.params.movieId,
  );
  ResponseHandler.success(res, {
    message: messages.CRUD.FETCHED("Review"),
    data: review,
  });
});

const getReviews = asyncHandler(async (req, res) => {
  const filter = pick(req.query, ["status", "movie", "user"]);
  const options = pick(req.query, [
    "sortBy",
    "limit",
    "page",
    "select",
    "populate",
  ]);
  const result = await reviewService.getReviews(filter, options);

  ResponseHandler.paginated(res, {
    message: messages.CRUD.LIST_FETCHED("Reviews"),
    data: result.results,
    meta: result.meta,
  });
});

const updateReview = asyncHandler(async (req, res) => {
  const review = await reviewService.updateReviewById(
    req.params.id,
    req.user.id,
    req.body,
  );

  let message = messages.CRUD.UPDATED("Review");
  if (review.status === "PENDING") {
    message = messages.REVIEW.PENDING_MODERATION;
  }

  ResponseHandler.success(res, {
    message: message,
    data: review,
  });
});

const updateReviewStatus = asyncHandler(async (req, res) => {
  const review = await reviewService.updateReviewStatus(
    req.params.id,
    req.body.status,
  );
  ResponseHandler.success(res, {
    message: messages.CRUD.UPDATED("Review status"),
    data: review,
  });
});

const deleteReview = asyncHandler(async (req, res) => {
  await reviewService.deleteReviewById(req.params.id, req.user.id);
  ResponseHandler.success(res, {
    message: messages.CRUD.DELETED("Review"),
  });
});

const deleteReviewByAdmin = asyncHandler(async (req, res) => {
  await reviewService.deleteReviewByAdmin(req.params.id);
  ResponseHandler.success(res, {
    message: messages.CRUD.DELETED("Review"),
  });
});

module.exports = {
  createReview,
  getMovieReviews,
  getMyReviewForMovie,
  getReviews,
  updateReview,
  updateReviewStatus,
  deleteReview,
  deleteReviewByAdmin,
};
