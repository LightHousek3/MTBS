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

const changePassword = {
    body: Joi.object().keys({
        currentPassword: Joi.string().required().min(6).messages({
            'string.min': 'Mật khẩu hiện tại phải có ít nhất 6 ký tự',
        }),
        newPassword: Joi.string()
            .required()
            .min(6)
            .invalid(Joi.ref('currentPassword'))
            .custom(password)
            .messages({
                'string.min': 'Mật khẩu mới phải có ít nhất 6 ký tự',
                'any.invalid': 'Mật khẩu mới không được trùng với mật khẩu hiện tại',
            }),
    }),
};

const updateProfile = {
    body: Joi.object().keys({
        firstName: Joi.string().max(10).trim(),
        lastName: Joi.string().max(10).trim(),
        avatar: Joi.string().uri().allow(null, ''),
        address: Joi.string().max(255).trim().allow(null, ''),
        phone: Joi.string().pattern(/^[0-9]{10,11}$/).allow(null, ''),
        age: Joi.number().integer().min(1).max(100),
        gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER').trim(),
    }),
};

const updateUserStatus = {
    params: Joi.object().keys({
        id: Joi.string().required().trim(),
    }),
    body: Joi.object().keys({
        status: Joi.string().required().valid('ACTIVE', 'INACTIVE', 'BLOCKED'),
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
    changePassword,
    updateProfile,
    updateUserStatus,
    resetPassword,
};
