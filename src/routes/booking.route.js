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

module.exports = router;
