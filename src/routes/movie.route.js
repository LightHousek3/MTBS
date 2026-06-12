/**
 * Route definitions for Movie-related endpoints.
 *
 * Mục đích file:
 * - Định nghĩa các endpoint public để lấy danh sách phim, phim đang chiếu, sắp chiếu và chi tiết phim.
 * - Định nghĩa các endpoint dành cho Admin để tạo, cập nhật, xóa phim (yêu cầu `authenticate` + `authorize`).
 *
 * Middleware chính:
 * - `validate(schema)`: kiểm tra request theo validator tương ứng.
 * - `authenticate`: xác thực người dùng (token/session).
 * - `authorize(role)`: kiểm tra quyền (ví dụ `USER_ROLE.ADMIN`).
 */

const express = require("express");
const { movieController } = require("../controllers");
const { authenticate, authorize, validate } = require("../../src/middlewares");
const { USER_ROLE } = require("../../src/constants");
const { movieValidator } = require("../validators");

// Tạo router instance từ Express
const router = express.Router();

// ═══════════════════════════════════════════════
// Public routes
// ═══════════════════════════════════════════════

/**
 * @route   GET /api/v1/movies/now-showing
 * @access  Public
 */
router.get("/now-showing", validate(movieValidator.getNowShowingMovies), movieController.getNowShowingMovies);

/**
 * @route   GET /api/v1/movies/coming-soon
 * @access  Public
 */
router.get("/coming-soon", validate(movieValidator.getUpcomingMovies), movieController.getUpcomingMovies);

/**
 * @route   GET /api/v1/movies
 * @access  Public
 */
router.get("/", validate(movieValidator.getMovies), movieController.getMovies);

/**
 * @route   GET /api/v1/movies/:id
 * @access  Public
 */
// Lấy chi tiết phim theo `id` (public)
router.get("/:id", validate(movieValidator.getMovie), movieController.getMovie);

// ═══════════════════════════════════════════════
// Admin-only routes (cần xác thực và quyền ADMIN)
// - Các route bên dưới chỉ cho phép Admin thực hiện thao tác tạo/cập nhật/xóa phim.
// - Gồm các middleware: `authenticate` -> `authorize(USER_ROLE.ADMIN)` -> `validate(...)` -> controller
// ═══════════════════════════════════════════════

/**
 * @route   POST /api/v1/movies/
 * @access  Private (Admin)
 */
router.post(
  "/",
  authenticate,
  authorize(USER_ROLE.ADMIN),
  validate(movieValidator.createMovie),
  movieController.createMovie,
);

/**
 * @route   PUT /api/v1/movies/:id
 * @access  Private (Admin)
 */
router.put(
  "/:id",
  authenticate,
  authorize(USER_ROLE.ADMIN),
  validate(movieValidator.updateMovie),
  movieController.updateMovie,
);

/**
 * @route   DELETE /api/v1/movies/:id
 * @access  Private (Admin)
 */
router.delete(
  "/:id",
  authenticate,
  authorize(USER_ROLE.ADMIN),
  validate(movieValidator.deleteMovie),
  movieController.deleteMovie,
);

// Xuất router để được mount trong file routes chính (ví dụ: /api/v1/movies)
module.exports = router;
