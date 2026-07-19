const { authService } = require('../services');
const { asyncHandler, ResponseHandler } = require('../utils');
const { messages } = require('../constants');
const config = require('../config');

/**
 * POST /auth/register
 * Register new user → sends verification email, account is INACTIVE
 */
const register = asyncHandler(async (req, res) => {
    const { user } = await authService.register(req.body);

    ResponseHandler.created(res, {
        message: messages.AUTH.REGISTER_SUCCESS,
        data: { user },
    });
});

/**
 * POST /auth/verify-email
 * Verify email using 6-digit code sent to user's inbox
 */
const verifyEmail = asyncHandler(async (req, res) => {
    const { email, code } = req.body;
    const { user } = await authService.verifyEmail(email, code);

    ResponseHandler.success(res, {
        message: messages.AUTH.EMAIL_VERIFIED,
        data: { user },
    });
});

/**
 * POST /auth/resend-verification
 * Resend the email verification link
 */
const resendVerificationEmail = asyncHandler(async (req, res) => {
    await authService.resendVerificationEmail(req.body.email);

    // Always return success (security: don't reveal if email exists)
    ResponseHandler.success(res, {
        message: messages.AUTH.RESEND_VERIFICATION_SENT,
    });
});

/**
 * POST /auth/login
 */
const login = asyncHandler(async (req, res) => {
    const { email, password, deviceId } = req.body;
    const { user, tokens } = await authService.login(email, password, deviceId);

    setRefreshTokenCookie(res, tokens.refreshToken);

    ResponseHandler.success(res, {
        message: messages.AUTH.LOGIN_SUCCESS,
        data: {
            user,
            tokens: {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            },
        },
    });
});

/**
 * POST /auth/google
 */
const loginWithGoogle = asyncHandler(async (req, res) => {
    const { idToken, deviceId } = req.body;
    const { user, tokens } = await authService.loginWithGoogle(idToken, deviceId);

    setRefreshTokenCookie(res, tokens.refreshToken);

    ResponseHandler.success(res, {
        message: 'Google login successful',
        data: {
            user,
            tokens: {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            },
        },
    });
});

/**
 * POST /auth/facebook
 */
const loginWithFacebook = asyncHandler(async (req, res) => {
    const { accessToken, deviceId } = req.body;
    const { user, tokens } = await authService.loginWithFacebook(accessToken, deviceId);

    setRefreshTokenCookie(res, tokens.refreshToken);

    ResponseHandler.success(res, {
        message: 'Facebook login successful',
        data: {
            user,
            tokens: {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            },
        },
    });
});

/**
 * POST /auth/logout
 */
const logout = asyncHandler(async (req, res) => {
    const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

    if (refreshToken) {
        await authService.logout(refreshToken);
    }

    clearRefreshTokenCookie(res);

    ResponseHandler.success(res, {
        message: messages.AUTH.LOGOUT_SUCCESS,
    });
});

/**
 * POST /auth/refresh-token
 */
const refreshTokens = asyncHandler(async (req, res) => {
    const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
    const {
        accessToken,
        refreshToken: newRefreshToken,
        user,
    } = await authService.refreshTokens(refreshToken);

    setRefreshTokenCookie(res, newRefreshToken);

    ResponseHandler.success(res, {
        message: messages.AUTH.TOKEN_REFRESHED,
        data: {
            user,
            accessToken,
            refreshToken: newRefreshToken,
        },
    });
});

/**
 * GET /auth/me
 * Return the latest authenticated user profile.
 */
const getMe = asyncHandler(async (req, res) => {
    ResponseHandler.success(res, {
        message: messages.CRUD.FETCHED('User'),
        data: req.user,
    });
});

/**
 * POST /auth/forgot-password
 * Send password reset email
 */
const forgotPassword = asyncHandler(async (req, res) => {
    await authService.forgotPassword(req.body.email);

    // Always return success (security: don't reveal if email exists)
    ResponseHandler.success(res, {
        message: messages.AUTH.FORGOT_PASSWORD_SENT,
    });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Set refresh token as httpOnly cookie
 */
const setRefreshTokenCookie = (res, token) => {
    res.cookie(config.cookie.refreshTokenName, token, getRefreshTokenCookieOptions());
};

/**
 * Clear refresh token cookie
 */
const clearRefreshTokenCookie = (res) => {
    res.clearCookie(config.cookie.refreshTokenName, getRefreshTokenCookieOptions({ maxAge: 0 }));
};

const getRefreshTokenCookieOptions = (overrides = {}) => {
    const options = {
        httpOnly: true,
        secure: config.cookie.secure,
        sameSite: config.cookie.sameSite,
        maxAge: config.cookie.refreshTokenMaxAgeMs,
        path: '/',
        ...overrides,
    };

    if (config.cookie.domain) {
        options.domain = config.cookie.domain;
    }

    return options;
};

module.exports = {
    register,
    verifyEmail,
    resendVerificationEmail,
    login,
    loginWithGoogle,
    loginWithFacebook,
    logout,
    refreshTokens,
    getMe,
    forgotPassword,
};
