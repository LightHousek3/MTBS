const mongoose = require('mongoose');
const { toJSON, paginate, softDelete } = require('./plugins');
const { REFUND_REQUEST_STATUS } = require('../constants');

const refundRequestSchema = new mongoose.Schema(
    {
        bookingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Booking',
            required: true,
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        reason: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000,
        },
        status: {
            type: String,
            enum: Object.values(REFUND_REQUEST_STATUS),
            default: REFUND_REQUEST_STATUS.PENDING,
            required: true,
            index: true,
        },
        refundAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        processedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        response: {
            type: String,
            trim: true,
            default: '',
        },
        refundedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    },
);

refundRequestSchema.index(
    { bookingId: 1, status: 1 },
    {
        unique: true,
        partialFilterExpression: { status: REFUND_REQUEST_STATUS.PENDING },
    },
);

refundRequestSchema.plugin(toJSON);
refundRequestSchema.plugin(paginate);
refundRequestSchema.plugin(softDelete);

const RefundRequest = mongoose.model('RefundRequest', refundRequestSchema);

module.exports = RefundRequest;
