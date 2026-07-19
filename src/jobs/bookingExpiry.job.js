const cron = require('node-cron');
const { Booking, Payment } = require('../models');
const { BOOKING_STATUS, PAYMENT_STATUS } = require('../constants');
const logger = require('../config/logger');
const { refundBookingServices } = require('../services/helpers/serviceStock');

/**
 * Update expired PENDING bookings.
 *
 * Runs every minute.
 * Logic:
 *  1. Find all PENDING bookings whose expiresAt has passed.
 *  2. FAILED any associated PENDING payment records.
 *  3. Update the expired booking.
 *
 */
const releaseExpiredBookings = async () => {
    const now = new Date();

    const expired = await Booking.find({
        status: BOOKING_STATUS.PENDING,
        expiresAt: { $lte: now },
    }).select('_id services');

    if (!expired.length) return;

    const cancelled = [];
    for (const booking of expired) {
        const claimed = await Booking.findOneAndUpdate(
            {
                _id: booking._id,
                status: BOOKING_STATUS.PENDING,
                expiresAt: { $lte: now },
            },
            {
                $set: { status: BOOKING_STATUS.CANCELLED },
                $unset: { expiresAt: '' },
            },
            { new: false },
        ).select('_id services');

        if (claimed) cancelled.push(claimed);
    }

    if (!cancelled.length) return;

    const cancelledIds = cancelled.map((booking) => booking._id);

    // Cancel any PENDING payment records tied to these bookings
    await Payment.updateMany(
        { bookingId: { $in: cancelledIds }, paymentStatus: 'PENDING' },
        { paymentStatus: PAYMENT_STATUS.FAILED },
    );

    for (const booking of cancelled) {
        await refundBookingServices(booking);
    }

    logger.info(`[BookingExpiryJob] Updated ${cancelled.length} expired booking(s)`);
};

/**
 * Start the booking expiry cron job.
 * Schedule: every minute (* * * * *)
 */
const startBookingExpiryJob = () => {
    cron.schedule('* * * * *', async () => {
        try {
            await releaseExpiredBookings();
        } catch (error) {
            logger.error('[BookingExpiryJob] Error releasing expired bookings', error);
        }
    });

    logger.info('[BookingExpiryJob] Booking expiry scheduler started (every 1 minute)');
};

module.exports = { startBookingExpiryJob };
