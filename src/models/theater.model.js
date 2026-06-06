const mongoose = require('mongoose');
const { toJSON, paginate, softDelete } = require('./plugins');

const theaterSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        location: {
            type: String,
            trim: true,
            maxlength: 255,
        },
        address: {
            type: String,
            required: true,
            trim: true,
            maxlength: 255,
        },
        phone: {
            type: String,
            trim: true,
            maxlength: 11,
        },
        // GeoJSON for geospatial queries (nearby theaters)
        coordinates: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point',
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                default: [0, 0],
            },
        },
    },
    {
        timestamps: true,
    },
);

// ─── Indexes ─────────────────────────────────────────────
theaterSchema.index({ coordinates: '2dsphere' });
theaterSchema.index({ name: 1 });

// ─── Plugins ─────────────────────────────────────────────
theaterSchema.plugin(toJSON);
theaterSchema.plugin(paginate);
theaterSchema.plugin(softDelete);

const Theater = mongoose.model('Theater', theaterSchema);

module.exports = Theater;
