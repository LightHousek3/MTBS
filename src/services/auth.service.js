const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const crypto = require('crypto');
const { User } = require('../models');
const { ApiError } = require('../utils');
const { httpStatus, messages, USER_STATUS, USER_AUTH_PROVIDER } = require('../constants');
const tokenService = require('./token.service');
const emailService = require('./email.service');
const config = require('../config');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate a 6-digit verification code and its SHA-256 hash
 * @returns {{ plainCode: string, hashedCode: string }}
 */
const generateVerificationCode = () => {
    const plainCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = crypto.createHash('sha256').update(plainCode).digest('hex');
    return { plainCode, hashedCode };
};

// ─── Register ─────────────────────────────────────────────────────────────────

/**
 * Register a new user (status: INACTIVE until email is verified)
 * @param {Object} body
 * @returns {Object} { user }
 */
const register = async (body) => {
    if (await User.isEmailTaken(body.email)) {
        throw new ApiError(httpStatus.CONFLICT, messages.AUTH.EMAIL_ALREADY_EXISTS);
    }

    const { plainCode, hashedCode } = generateVerificationCode();
    const expiresHours = config.email.verificationExpiresHours;

    const user = await User.create({
        firstName: body.firstName,
        lastName: body.lastName,
        gender: body.gender,
        address: body.address,
        age: body.age,
        email: body.email,
        password: body.password,
        phone: body.phone || null,
        status: USER_STATUS.INACTIVE,
        emailVerificationToken: hashedCode,
        emailVerificationExpires: new Date(Date.now() + expiresHours * 60 * 60 * 1000),
    });

    // Send async — don't block the response
    emailService
        .sendVerificationEmail({
            to: user.email,
            firstName: user.firstName,
            verificationCode: plainCode,
        })
        .catch((err) => {
            console.error('[EmailService] Failed to send verification email:', err.message);
        });

    return { user };
};

// ─── Verify Email ─────────────────────────────────────────────────────────────

/**
 * Verify user email using the 6-digit code sent to their email
 * @param {string} email - User's email
 * @param {string} code - 6-digit verification code
 * @returns {Object} { user }
 */
const verifyEmail = async (email, code) => {
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

    const user = await User.findOne({
        email,
        emailVerificationToken: hashedCode,
        emailVerificationExpires: { $gt: new Date() },
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
        throw new ApiError(httpStatus.BAD_REQUEST, messages.AUTH.INVALID_VERIFICATION_TOKEN);
    }

    if (user.status === USER_STATUS.ACTIVE) {
        throw new ApiError(httpStatus.BAD_REQUEST, messages.AUTH.ALREADY_VERIFIED);
    }

    user.status = USER_STATUS.ACTIVE;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    return { user };
};

// ─── Resend Verification Email ────────────────────────────────────────────────

/**
 * Resend the email verification link
 * @param {string} email
 */
const resendVerificationEmail = async (email) => {
    const user = await User.findOne({ email }).select(
        '+emailVerificationToken +emailVerificationExpires',
    );

    if (!user) {
        throw new ApiError(httpStatus.BAD_REQUEST, messages.AUTH.EMAIL_NOT_FOUND);
    }

    if (user.status === USER_STATUS.ACTIVE) {
        throw new ApiError(httpStatus.BAD_REQUEST, messages.AUTH.ALREADY_VERIFIED);
    }

    if (user.status === USER_STATUS.BLOCKED) {
        throw new ApiError(httpStatus.FORBIDDEN, messages.AUTH.ACCOUNT_BLOCKED);
    }

    // Rate limit: 1 email per 60 seconds
    const expiresHours = config.email.verificationExpiresHours;
    if (user.emailVerificationExpires) {
        const sentAt = new Date(
            user.emailVerificationExpires.getTime() - expiresHours * 60 * 60 * 1000,
        );
        const secondsSinceSent = (Date.now() - sentAt.getTime()) / 1000;
        if (secondsSinceSent < 60) {
            throw new ApiError(httpStatus.TOO_MANY_REQUESTS, messages.AUTH.RESEND_TOO_SOON);
        }
    }

    const { plainCode, hashedCode } = generateVerificationCode();
    user.emailVerificationToken = hashedCode;
    user.emailVerificationExpires = new Date(Date.now() + expiresHours * 60 * 60 * 1000);
    await user.save();

    await emailService.sendVerificationEmail({
        to: user.email,
        firstName: user.firstName,
        verificationCode: plainCode,
    });
};

// ─── Login ────────────────────────────────────────────────────────────────────

/**
 * Login with email and password
 * @param {string} email
 * @param {string} password
 * @param {string} [deviceId]
 * @returns {Object} { user, tokens }
 */
const login = async (email, password, deviceId) => {
    const user = await User.findOne({ email });

    if (!user || !(await user.isPasswordMatch(password))) {
        throw new ApiError(httpStatus.UNAUTHORIZED, messages.AUTH.INVALID_CREDENTIALS);
    }

    if (user.status === USER_STATUS.BLOCKED) {
        throw new ApiError(httpStatus.FORBIDDEN, messages.AUTH.ACCOUNT_BLOCKED);
    }

    if (user.status === USER_STATUS.INACTIVE) {
        throw new ApiError(httpStatus.FORBIDDEN, messages.AUTH.ACCOUNT_INACTIVE);
    }

    const tokens = await tokenService.generateAuthTokens(user, deviceId);

    return { user, tokens };
};

// ─── Logout ───────────────────────────────────────────────────────────────────

/**
 * Logout - revoke refresh token
 * @param {string} refreshToken
 */
const logout = async (refreshToken) => {
    await tokenService.revokeRefreshToken(refreshToken);
};

// ─── Refresh Tokens ───────────────────────────────────────────────────────────

/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Object} { accessToken, refreshToken, user }
 */
const refreshTokens = async (refreshToken) => {
    return tokenService.refreshAuthTokens(refreshToken);
};

// ─── Forgot Password ──────────────────────────────────────────────────────────

/**
 * Reset password instantly and send new password to email
 * @param {string} email
 */
const forgotPassword = async (email) => {
    const user = await User.findOne({ email });

    // Security: return silently if user not found
    if (!user) {
        throw ApiError.notFound(messages.AUTH.EMAIL_NOT_FOUND);
    }

    // Don't send to blocked users
    if (user.status === USER_STATUS.BLOCKED) {
        throw ApiError.forbidden(messages.AUTH.ACCOUNT_BLOCKED);
    }

    // Generate random 8-character password
    const newPassword = crypto.randomBytes(4).toString('hex');

    // Update password
    user.password = newPassword;
    if (user.status === USER_STATUS.INACTIVE) {
        user.status = USER_STATUS.ACTIVE;
    }
    await user.save();

    // Revoke all existing refresh tokens for security
    await tokenService.revokeAllUserTokens(user._id);

    // Send the new password to the user via email
    await emailService.sendForgotPasswordEmail({
        to: user.email,
        firstName: user.firstName,
        newPassword,
    });
};

// ─── Social Logins ────────────────────────────────────────────────────────────

const googleClient = new OAuth2Client(config.socialLogin.googleClientId);

const assertSocialLoginConfigured = (provider, values) => {
    if (values.some((value) => !value)) {
        throw new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR,
            `${provider} login is not configured on the server`,
        );
    }
};

const normalizeProfileName = (value, fallback) => {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return (normalized || fallback).slice(0, 10);
};

const addAuthProvider = (user, provider) => {
    const providers = Array.isArray(user.authProvider)
        ? user.authProvider
        : [user.authProvider].filter(Boolean);
    if (!providers.includes(provider)) providers.push(provider);
    user.authProvider = providers;
};

/**
 * Login with Google ID Token
 * @param {string} idToken
 * @param {string} [deviceId]
 * @returns {Object} { user, tokens }
 */
const loginWithGoogle = async (idToken, deviceId) => {
    assertSocialLoginConfigured('Google', [config.socialLogin.googleClientId]);

    let payload;
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: config.socialLogin.googleClientId,
        });
        payload = ticket.getPayload();
    } catch (error) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid Google token');
    }

    if (!payload || !payload.email || payload.email_verified !== true) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Google account email is not verified');
    }

    const { email, given_name, family_name, picture, sub: googleId } = payload;
    const normalizedEmail = email.trim().toLowerCase();

    let user = await User.findOne({ googleId });
    if (!user) user = await User.findOne({ email: normalizedEmail });

    if (user) {
        if (user.status === USER_STATUS.BLOCKED) {
            throw new ApiError(httpStatus.FORBIDDEN, messages.AUTH.ACCOUNT_BLOCKED);
        }
        if (user.googleId && user.googleId !== googleId) {
            throw new ApiError(httpStatus.CONFLICT, 'Email is linked to another Google account');
        }
        user.googleId = googleId;
        addAuthProvider(user, USER_AUTH_PROVIDER.GOOGLE);
        if (!user.avatar && picture) user.avatar = picture;
        await user.save();
    } else {
        user = await User.create({
            firstName: normalizeProfileName(given_name, 'User'),
            lastName: normalizeProfileName(family_name, 'Google'),
            email: normalizedEmail,
            avatar: picture || null,
            status: USER_STATUS.ACTIVE,
            googleId,
            authProvider: [USER_AUTH_PROVIDER.GOOGLE],
        });
    }

    const tokens = await tokenService.generateAuthTokens(user, deviceId);
    return { user, tokens };
};

/**
 * Login with Facebook Access Token
 * @param {string} accessToken
 * @param {string} [deviceId]
 * @returns {Object} { user, tokens }
 */
const loginWithFacebook = async (accessToken, deviceId) => {
    const { facebookAppId, facebookAppSecret, facebookGraphApiVersion } = config.socialLogin;
    assertSocialLoginConfigured('Facebook', [facebookAppId, facebookAppSecret]);

    let fbUserData;
    try {
        const graphBaseUrl = `https://graph.facebook.com/${facebookGraphApiVersion}`;
        const appAccessToken = `${facebookAppId}|${facebookAppSecret}`;
        const { data: debugResponse } = await axios.get(`${graphBaseUrl}/debug_token`, {
            params: { input_token: accessToken, access_token: appAccessToken },
        });
        const tokenData = debugResponse?.data;
        if (!tokenData?.is_valid || tokenData.app_id !== facebookAppId) {
            throw new Error('Facebook token is invalid or belongs to another app');
        }

        const appSecretProof = crypto
            .createHmac('sha256', facebookAppSecret)
            .update(accessToken)
            .digest('hex');
        const { data } = await axios.get(`${graphBaseUrl}/me`, {
            params: {
                fields: 'id,first_name,last_name,email,picture.type(large)',
                access_token: accessToken,
                appsecret_proof: appSecretProof,
            },
        });
        fbUserData = data;
    } catch (error) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid Facebook token');
    }

    if (!fbUserData || !fbUserData.email) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Facebook token does not provide email access');
    }

    const { email, first_name, last_name, id: facebookId, picture } = fbUserData;
    const avatarUrl = picture?.data?.url || null;
    const normalizedEmail = email.trim().toLowerCase();

    let user = await User.findOne({ facebookId });
    if (!user) user = await User.findOne({ email: normalizedEmail });

    if (user) {
        if (user.status === USER_STATUS.BLOCKED) {
            throw new ApiError(httpStatus.FORBIDDEN, messages.AUTH.ACCOUNT_BLOCKED);
        }
        if (user.facebookId && user.facebookId !== facebookId) {
            throw new ApiError(httpStatus.CONFLICT, 'Email is linked to another Facebook account');
        }
        user.facebookId = facebookId;
        addAuthProvider(user, USER_AUTH_PROVIDER.FACEBOOK);
        if (!user.avatar && avatarUrl) user.avatar = avatarUrl;
        await user.save();
    } else {
        user = await User.create({
            firstName: normalizeProfileName(first_name, 'User'),
            lastName: normalizeProfileName(last_name, 'Facebook'),
            email: normalizedEmail,
            avatar: avatarUrl,
            status: USER_STATUS.ACTIVE,
            facebookId,
            authProvider: [USER_AUTH_PROVIDER.FACEBOOK],
        });
    }

    const tokens = await tokenService.generateAuthTokens(user, deviceId);
    return { user, tokens };
};

module.exports = {
    register,
    verifyEmail,
    resendVerificationEmail,
    login,
    logout,
    refreshTokens,
    forgotPassword,
    loginWithGoogle,
    loginWithFacebook,
};
