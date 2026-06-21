const Joi = require('joi');
const { password } = require('./custom.validator');

const register = {
    body: Joi.object().keys({
        firstName: Joi.string().required().max(10).trim(),
        lastName: Joi.string().required().max(10).trim(),
        gender: Joi.string().required().max(10).trim(),
        address: Joi.string().required().max(255).trim(),
        age: Joi.number().integer().min(1).max(100),
        email: Joi.string().required().email().max(50),
        password: Joi.string().required().custom(password),
        phone: Joi.string()
            .pattern(/^[0-9]{10,11}$/)
            .allow(null, ''),
    }),
};

const login = {
    body: Joi.object().keys({
        email: Joi.string().required().email(),
        password: Joi.string().required(),
        deviceId: Joi.string().allow(null, ''),
    }),
};

const loginWithGoogle = {
    body: Joi.object().keys({
        idToken: Joi.string().required(),
        deviceId: Joi.string().guid({ version: ['uuidv4'] }).required(),
    }),
};

const loginWithFacebook = {
    body: Joi.object().keys({
        accessToken: Joi.string().required(),
        deviceId: Joi.string().guid({ version: ['uuidv4'] }).required(),
    }),
};

const refreshToken = {};

const logout = {};

const verifyEmail = {
    body: Joi.object().keys({
        email: Joi.string().required().email(),
        code: Joi.string().required().length(6),
    }),
};

const resendVerificationEmail = {
    body: Joi.object().keys({
        email: Joi.string().required().email(),
    }),
};

const forgotPassword = {
    body: Joi.object().keys({
        email: Joi.string().required().email(),
    }),
};

const resetPassword = {
    query: Joi.object().keys({
        token: Joi.string().required(),
    }),
    body: Joi.object().keys({
        password: Joi.string().required().custom(password),
    }),
};

module.exports = {
    register,
    login,
    loginWithGoogle,
    loginWithFacebook,
    refreshToken,
    logout,
    verifyEmail,
    resendVerificationEmail,
    forgotPassword,
    resetPassword,
};
