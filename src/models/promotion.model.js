const mongoose = require('mongoose');
const { toJSON, paginate, softDelete } = require('./plugins');
const {
    SEAT_TYPE,
    MOVIE_TYPE,
    DAY_TYPE,
    SERVICE_TYPE,
    DISCOUNT_TYPE,
    PROMOTION_STATUS,
} = require('../constants');

const promotionTicketSchema = new mongoose.Schema(
    {
        typeSeat: {
            type: [String],
            enum: Object.values(SEAT_TYPE),
            default: [],
        },
        typeMovie: {
            type: [String],
            enum: Object.values(MOVIE_TYPE),
            default: [],
        },
        dayType: {
            type: [String],
            enum: ['WEEKDAY', 'WEEKEND'],
            default: [],
        },
    },
    { _id: false },
);

const promotionServiceSchema = new mongoose.Schema(
    {
        typeService: {
            type: [String],
            enum: Object.values(SERVICE_TYPE),
            default: [],
        },
    },
    { _id: false },
);

const promotionSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 255,
        },

        description: {
            type: String,
            default: null,
        },

        discountType: {
            type: String,
            enum: Object.values(DISCOUNT_TYPE),
            required: true,
        },

        discountValue: {
            type: Number,
            required: true,
        },

        startDate: {
            type: Date,
            required: true,
        },

        endDate: {
            type: Date,
            required: true,
        },

        status: {
            type: String,
            enum: Object.values(PROMOTION_STATUS),
            default: PROMOTION_STATUS.UPCOMING,
            index: true,
        },

        imageUrl: {
            type: String,
            default: null,
        },

        promotionTickets: promotionTicketSchema,

        promotionServices: promotionServiceSchema,
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    },
);

// Indexes
promotionSchema.index({ status: 1, startDate: 1 });

// plugins
promotionSchema.plugin(toJSON);
promotionSchema.plugin(paginate);
promotionSchema.plugin(softDelete);

const Promotion = mongoose.model('Promotion', promotionSchema);

module.exports = Promotion;
