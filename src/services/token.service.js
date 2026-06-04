const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const config = require('../config');
const { RefreshToken } = require('../models');
const { ApiError } = require('../utils');
const { messages } = require('../constants');

/**
 * Generate JWT access token
 * @param {Object} user - User document
 * @returns {string} JWT token
 */
const generateAccessToken = (user) => {
    const payload = {
        sub: user._id,
        role: user.role,
        type: 'access',
    };
    return jwt.sign(payload, config.jwt.accessSecret, {
        expiresIn: config.jwt.accessExpiration,
    });
};

/**
 * Generate JWT refresh token and store hash in DB
 * @param {Object} user - User document
 * @param {string} [deviceId] - Device identifier for multi-device support
 * @returns {string} Refresh token
 */
const generateRefreshToken = async (user, deviceId = null) => {
    const payload = {
        sub: user._id,
        type: 'refresh',
        jti: crypto.randomUUID(),
    };
    const token = jwt.sign(payload, config.jwt.refreshSecret, {
        expiresIn: config.jwt.refreshExpiration,
    });

    // Hash the token for secure storage
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Parse expiration
    const decoded = jwt.decode(token);
    const expiresAt = new Date(decoded.exp * 1000);

    // Remove old token for same device (if any)
    if (deviceId) {
        await RefreshToken.deleteMany({ user: user._id, deviceId });
    }

    // Store hashed token
    await RefreshToken.create({
        user: user._id,
        tokenHash,
        deviceId,
        expiresAt,
    });

    return token;
};

/**
 * Generate both access and refresh tokens
 * @param {Object} user - User document
 * @param {string} [deviceId] - Device identifier
 * @returns {Object} { accessToken, refreshToken }
 */
const generateAuthTokens = async (user, deviceId = null) => {
    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user, deviceId);
    return { accessToken, refreshToken };
};

/**
 * Verify refresh token and return new token pair
 * @param {string} refreshToken - Refresh token string
 * @returns {Object} { accessToken, refreshToken, user }
 */
const refreshAuthTokens = async (refreshToken) => {
    try {
        const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

        const storedToken = await RefreshToken.findOne({
            tokenHash,
            user: decoded.sub,
            revokedAt: null,
        });

        if (!storedToken) {
            throw ApiError.unauthorized(messages.AUTH.INVALID_REFRESH_TOKEN);
        }

        if (storedToken.isExpired) {
            throw ApiError.unauthorized(messages.AUTH.INVALID_REFRESH_TOKEN);
        }

        // Revoke old token (token rotation)
        storedToken.revokedAt = new Date();
        await storedToken.save();

        // Import User here to avoid circular dependency
        const { User } = require('../models');
        const user = await User.findById(decoded.sub);
        if (!user) {
            throw ApiError.unauthorized(messages.AUTH.UNAUTHORIZED);
        }

        // Generate new token pair
        const tokens = await generateAuthTokens(user, storedToken.deviceId);

        return { ...tokens, user };
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
            throw ApiError.unauthorized(messages.AUTH.INVALID_REFRESH_TOKEN);
        }
        throw error;
    }
};

/**
 * Revoke a specific refresh token
 */
const revokeRefreshToken = async (refreshToken) => {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const storedToken = await RefreshToken.findOne({ tokenHash, revokedAt: null });
    if (storedToken) {
        storedToken.revokedAt = new Date();
        await storedToken.save();
    }
};

/**
 * Revoke all refresh tokens for a user
 */
const revokeAllUserTokens = async (userId) => {
    await RefreshToken.revokeAllForUser(userId);
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    generateAuthTokens,
    refreshAuthTokens,
    revokeRefreshToken,
    revokeAllUserTokens,
};
