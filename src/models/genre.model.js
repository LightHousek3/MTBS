const mongoose = require('mongoose');
const { toJSON, paginate, softDelete } = require('./plugins');

const genreSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            maxlength: 255,
        },
    },
    {
        timestamps: true,
    },
);

// ─── Plugins ─────────────────────────────────────────────
genreSchema.plugin(toJSON);
genreSchema.plugin(paginate);
genreSchema.plugin(softDelete);

const Genre = mongoose.model('Genre', genreSchema);

module.exports = Genre;
