const mongoose = require('mongoose');
const { toJSON, paginate, softDelete } = require('./plugins');
const { SEAT_TYPE, SEAT_STATUS } = require('../constants');

const seatSchema = new mongoose.Schema(
    {
        screenId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Screen',
            required: true,
            index: true,
        },

        seatNumber: {
            type: String,
            required: true,
            trim: true,
            maxlength: 50,
        },

        status: {
            type: String,
            enum: Object.values(SEAT_STATUS),
            default: SEAT_STATUS.AVAILABLE,
            index: true,
        },

        type: {
            type: String,
            enum: Object.values(SEAT_TYPE),
            default: SEAT_TYPE.STANDARD,
            index: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    },
);

seatSchema.index({ screenId: 1, seatNumber: 1 }, { unique: true });

seatSchema.plugin(toJSON);
seatSchema.plugin(paginate);
seatSchema.plugin(softDelete);

const Seat = mongoose.model('Seat', seatSchema);

module.exports = Seat;
