const express = require('express');
const { bookingController } = require('../controllers');
const { authenticate, authorize, validate } = require('../middlewares');
const { bookingValidator } = require('../validators');
const { USER_ROLE } = require('../constants');

const router = express.Router();

// ═══════════════════════════════════════════════
// Customer routes (authenticated)
// ═══════════════════════════════════════════════

/**
 * @route   POST /api/v1/bookings
 * @desc    Create a booking (10-min seat hold, pending payment)
 * @access  Customer
 */
router.post(
    '/',
    authenticate,
    validate(bookingValidator.createBooking),
    authorize(USER_ROLE.USER),
    bookingController.createBooking,
);

/**
 * @route   PATCH /api/v1/bookings/:id/cancel
 * @desc    Cancel a PENDING booking
 * @access  Customer (owner)
 */
router.patch(
    '/:id/cancel',
    authenticate,
    validate(bookingValidator.cancelBooking),
    bookingController.cancelBooking,
);

/**
 * @route   GET /api/v1/bookings/stats/overview
 * @desc    Admin: booking overview stats
 * @access  Admin
 */
router.get(
    '/stats/overview',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    bookingController.getOverviewStats,
);

/**
 * @route   GET /api/v1/bookings/stats/revenue-by-genre
 * @desc    Admin: revenue grouped by genre
 * @access  Admin
 */
router.get(
    '/stats/revenue-by-genre',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    bookingController.getRevenueByGenre,
);

/**
 * @route   GET /api/v1/bookings/stats/revenue-by-month
 * @desc    Admin: revenue grouped by month
 * @access  Admin
 */
router.get(
    '/stats/revenue-by-month',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    bookingController.getRevenueByMonth,
);

/**
 * @route   GET /api/v1/bookings/stats/revenue-by-year
 * @desc    Admin: revenue grouped by year
 * @access  Admin
 */
router.get(
    '/stats/revenue-by-year',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    bookingController.getRevenueByYear,
);

/**
 * @route   GET /api/v1/bookings/stats/revenue-by-theater
 * @desc    Admin: revenue grouped by theater
 * @access  Admin
 */
router.get(
    '/stats/revenue-by-theater',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    bookingController.getRevenueByTheater,
);

/**
 * @route   GET /api/v1/bookings/stats/export
 * @desc    Admin: export full dashboard as Excel (.xlsx)
 * @access  Admin
 */
router.get(
    '/stats/export',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    bookingController.exportDashboard,
);

module.exports = router;
