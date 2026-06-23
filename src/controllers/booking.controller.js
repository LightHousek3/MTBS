const { bookingService } = require('../services');
const { asyncHandler, ResponseHandler, pick } = require('../utils');
const { messages } = require('../constants');

/**
 * POST /bookings
 * Create a booking (customer). Returns the booking + 10-minute hold.
 */
const createBooking = asyncHandler(async (req, res) => {
    const booking = await bookingService.createBooking(req.user.id, req.body);
    ResponseHandler.created(res, {
        message: messages.BOOKING.BOOKING_SUCCESS,
        data: booking,
    });
});

const getPendingBooking = asyncHandler(async (req, res) => {
    const booking = await bookingService.getPendingBooking(req.user.id);
    ResponseHandler.success(res, { data: booking });
});

const getBookingById = asyncHandler(async (req, res) => {
    const booking = await bookingService.getBookingById(req.params.id, req.user.id);
    ResponseHandler.success(res, { data: booking });
});

/**
 * PATCH /bookings/:id/cancel
 * Cancel a PENDING_PAYMENT booking (owner only).
 */
const cancelBooking = asyncHandler(async (req, res) => {
    const booking = await bookingService.cancelBooking(req.params.id, req.user.id);
    ResponseHandler.success(res, {
        message: messages.BOOKING.BOOKING_CANCELLED,
        data: booking,
    });
});

module.exports = {
    createBooking,
    getPendingBooking,
    getBookingById,
    cancelBooking,
};
