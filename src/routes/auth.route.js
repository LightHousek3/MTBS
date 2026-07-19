const express = require('express');
const { authController } = require('../../src/controllers');
const { validate, authLimiter, authenticate } = require('../../src/middlewares');
const { authValidator } = require('../../src/validators');

const router = express.Router();

// ─── Registration & Email Verification ───────────────────────────────────────

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new user (account INACTIVE until email verified)
 * @access  Public
 */
router.post('/register', authLimiter, validate(authValidator.register), authController.register);

/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify email using 6-digit code
 * @access  Public
 */
router.post('/verify-email', validate(authValidator.verifyEmail), authController.verifyEmail);

/**
 * @route   POST /api/v1/auth/resend-verification
 * @desc    Resend email verification link
 * @access  Public
 */
router.post(
    '/resend-verification',
    authLimiter,
    validate(authValidator.resendVerificationEmail),
    authController.resendVerificationEmail,
);

// ─── Authentication ───────────────────────────────────────────────────────────

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user (only ACTIVE accounts)
 * @access  Public
 */
router.post('/login', authLimiter, validate(authValidator.login), authController.login);

/**
 * @route   POST /api/v1/auth/google
 * @desc    Login with Google
 * @access  Public
 */
router.post(
    '/google',
    authLimiter,
    validate(authValidator.loginWithGoogle),
    authController.loginWithGoogle,
);

/**
 * @route   POST /api/v1/auth/facebook
 * @desc    Login with Facebook
 * @access  Public
 */
router.post(
    '/facebook',
    authLimiter,
    validate(authValidator.loginWithFacebook),
    authController.loginWithFacebook,
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user (revoke refresh token)
 * @access  Public
 */
router.post('/logout', validate(authValidator.logout), authController.logout);

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh-token', validate(authValidator.refreshToken), authController.refreshTokens);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get latest authenticated user profile
 * @access  Private
 */
router.get('/me', authenticate, authController.getMe);

// ─── Forgot / Reset Password ──────────────────────────────────────────────────

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Send password reset link to user email
 * @access  Public
 */
router.post(
    '/forgot-password',
    authLimiter,
    validate(authValidator.forgotPassword),
    authController.forgotPassword,
);

module.exports = router;
