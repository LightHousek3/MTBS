const mongoose = require('mongoose');
const { toJSON, paginate, softDelete } = require('./plugins');
const { BOOKING_STATUS } = require('../constants');

/**
 * Booking Model
 *
 * - seats: embedded sub-documents (no separate BookingSeat collection needed)
 * - services: embedded sub-documents
 * - status: PENDING → CONFIRMED or CANCELLED
 * - expiresAt: 10-minute hold window; cron auto-deletes expired pending bookings
 */

// ── Sub-schema: Booking Seat ─────────────────────────────
const bookingSeatSchema = new mongoose.Schema(
    {
        seat: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Seat',
            required: true,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    { _id: false },
);

// ── Sub-schema: Booking Service ──────────────────────────
const bookingServiceSchema = new mongoose.Schema(
    {
        service: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Service',
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        unitPrice: {
            type: Number,
            required: true,
            min: 0,
        },
        total: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    { _id: false },
);

const bookingSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        showtime: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Showtime',
            required: true,
            index: true,
        },
        seats: {
            type: [bookingSeatSchema],
            validate: {
                validator: (v) => v.length > 0,
                message: 'At least one seat must be selected',
            },
        },
        services: {
            type: [bookingServiceSchema],
            default: [],
        },
        totalSeat: {
            type: Number,
            required: true,
            min: 1,
        },
        seatTotal: {
            type: Number,
            required: true,
            min: 0,
        },
        serviceTotal: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        promotionDiscount: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalPrice: {
            type: Number,
            required: true,
            min: 0,
        },
        status: {
            type: String,
            enum: Object.values(BOOKING_STATUS),
            default: BOOKING_STATUS.PENDING,
            index: true,
        },
        expiresAt: {
            type: Date,
            index: true,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    },
);

// ─── Indexes ─────────────────────────────────────────────
bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ showtime: 1, 'seats.seat': 1 });

// ─── Plugins ─────────────────────────────────────────────
bookingSchema.plugin(toJSON);
bookingSchema.plugin(paginate);
bookingSchema.plugin(softDelete);

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
