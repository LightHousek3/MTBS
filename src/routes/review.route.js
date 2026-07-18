const express = require("express");
const { reviewController } = require("../controllers");
const { authenticate, authorize, validate } = require("../middlewares");
const { reviewValidator } = require("../validators");
const { USER_ROLE } = require("../constants");

const router = express.Router();

// ═══════════════════════════════════════════════
// Public routes
// ═══════════════════════════════════════════════

/**
 * @route   GET /api/v1/reviews/movie/:movieId
 * @access  Public
 */
router.get(
  "/movie/:movieId",
  validate(reviewValidator.getMovieReviews),
  reviewController.getMovieReviews,
);

// ═══════════════════════════════════════════════
// Customer routes
// ═══════════════════════════════════════════════

/**
 * @route   POST /api/v1/reviews
 * @access  Customer
 */
router.post(
  "/",
  authenticate,
  authorize(USER_ROLE.USER),
  validate(reviewValidator.createReview),
  reviewController.createReview,
);

/**
 * @route   PATCH /api/v1/reviews/me/:id
 * @access  Customer
 */
router.patch(
  "/me/:id",
  authenticate,
  authorize(USER_ROLE.USER),
  validate(reviewValidator.updateReview),
  reviewController.updateReview,
);

/**
 * @route   GET /api/v1/reviews/me/movie/:movieId
 * @access  Customer
 */
router.get(
  "/me/movie/:movieId",
  authenticate,
  authorize(USER_ROLE.USER),
  reviewController.getMyReviewForMovie,
);

/**
 * @route   DELETE /api/v1/reviews/me/:id
 * @access  Customer
 */
router.delete(
  "/me/:id",
  authenticate,
  authorize(USER_ROLE.USER),
  validate(reviewValidator.deleteReview),
  reviewController.deleteReview,
);

// ═══════════════════════════════════════════════
// Admin routes
// ═══════════════════════════════════════════════

/**
 * @route   GET /api/v1/reviews
 * @access  Admin
 */
router.get(
  "/",
  authenticate,
  authorize(USER_ROLE.ADMIN),
  validate(reviewValidator.getReviews),
  reviewController.getReviews,
);

/**
 * @route   PATCH /api/v1/reviews/:id/status
 * @access  Admin
 */
router.patch(
  "/:id/status",
  authenticate,
  authorize(USER_ROLE.ADMIN),
  validate(reviewValidator.updateReviewStatus),
  reviewController.updateReviewStatus,
);

/**
 * @route   DELETE /api/v1/reviews/:id
 * @access  Admin
 */
router.delete(
  "/:id",
  authenticate,
  authorize(USER_ROLE.ADMIN),
  validate(reviewValidator.deleteReviewByAdmin),
  reviewController.deleteReviewByAdmin,
);

module.exports = router;
