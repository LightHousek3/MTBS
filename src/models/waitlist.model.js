const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const waitlistSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        movie: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Movie',
            required: true,
            index: true,
        },
        notifiedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    },
);

waitlistSchema.index({ user: 1, movie: 1 }, { unique: true });
waitlistSchema.index({ notifiedAt: 1, createdAt: -1 });

waitlistSchema.plugin(toJSON);
waitlistSchema.plugin(paginate);

const Waitlist = mongoose.model('Waitlist', waitlistSchema);

module.exports = Waitlist;
