const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const refreshTokenSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        tokenHash: {
            type: String,
            required: true,
            index: true,
        },
        deviceId: {
            type: String,
            default: null,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expireAfterSeconds: 0 }, // TTL index: auto-delete expired tokens
        },
        revokedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

// ─── Plugins ─────────────────────────────────────────────
refreshTokenSchema.plugin(toJSON);

// ─── Index ───────────────────────────────────────────────
refreshTokenSchema.index({ user: 1, deviceId: 1 });

// ─── Virtual: isExpired ──────────────────────────────────
refreshTokenSchema.virtual('isExpired').get(function () {
    return this.expiresAt < new Date();
});

// ─── Virtual: isRevoked ──────────────────────────────────
refreshTokenSchema.virtual('isRevoked').get(function () {
    return !!this.revokedAt;
});

// ─── Static: Revoke all tokens for a user ────────────────
refreshTokenSchema.statics.revokeAllForUser = async function (userId) {
    return this.updateMany(
        { user: userId, revokedAt: null },
        { revokedAt: new Date() }
    );
};

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

module.exports = RefreshToken;
