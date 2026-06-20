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

module.exports = {
    createBooking,
};
