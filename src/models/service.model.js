const mongoose = require('mongoose');
const { toJSON, paginate, softDelete } = require('./plugins');
const { SERVICE_STATUS, SERVICE_TYPE } = require('../constants');

const serviceSchema = new mongoose.Schema(
    {
        theater: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Theater',
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 255,
        },
        description: {
            type: String,
            default: '',
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        status: {
            type: String,
            enum: Object.values(SERVICE_STATUS),
            default: SERVICE_STATUS.AVAILABLE,
        },
        imageUrl: {
            type: String,
            default: null,
        },
        quantity: {
            type: Number,
            default: 0,
            min: 0,
        },
        type: {
            type: String,
            enum: Object.values(SERVICE_TYPE),
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// ─── Indexes ─────────────────────────────────────────────
serviceSchema.index({ theater: 1, name: 1 }, { unique: true });
serviceSchema.index({ theater: 1, type: 1 });
serviceSchema.index({ status: 1 });

// ─── Plugins ─────────────────────────────────────────────
serviceSchema.plugin(toJSON);
serviceSchema.plugin(paginate);
serviceSchema.plugin(softDelete);

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service;
