const { User } = require('../models');
const { ApiError } = require('../utils');
const { messages, USER_STATUS, USER_AUTH_PROVIDER } = require('../constants');
const tokenService = require('./token.service');

const getProfileById = async (userId) => {
    const user = await User.findById(userId).select('-password -emailVerificationToken -emailVerificationExpires');

    if (!user) {
        throw ApiError.notFound(messages.CRUD.NOT_FOUND('User'));
    }

    return user;
};

const updateProfileById = async (userId, updateBody) => {
    const user = await User.findById(userId);

    if (!user) {
        throw ApiError.notFound(messages.CRUD.NOT_FOUND('User'));
    }

    const allowedFields = ['firstName', 'lastName', 'avatar', 'address', 'phone', 'age', 'gender'];
    const updates = {};

    allowedFields.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(updateBody, field)) {
            updates[field] = updateBody[field];
        }
    });

    if (updates.phone === '' || updates.phone === null) {
        updates.phone = null;
    }

    Object.assign(user, updates);
    await user.save();

    return user;
};

const changePasswordById = async (userId, currentPassword, newPassword) => {
    const user = await User.findById(userId);

    if (!user) {
        throw ApiError.notFound(messages.CRUD.NOT_FOUND('User'));
    }

    if (!user.password || (user.authProvider || []).includes(USER_AUTH_PROVIDER.GOOGLE) || (user.authProvider || []).includes(USER_AUTH_PROVIDER.FACEBOOK)) {
        throw ApiError.badRequest('Tài khoản này không hỗ trợ đổi mật khẩu bằng mật khẩu local');
    }

    const isMatch = await user.isPasswordMatch(currentPassword);
    if (!isMatch) {
        throw ApiError.badRequest('Mật khẩu hiện tại không đúng');
    }

    user.password = newPassword;
    await user.save();
    await tokenService.revokeAllUserTokens(user._id);

    return user;
};

const getUserList = async (filter = {}, options = {}) => {
    const queryFilter = {};

    if (filter.search) {
        queryFilter.$or = [
            { firstName: { $regex: filter.search, $options: 'i' } },
            { lastName: { $regex: filter.search, $options: 'i' } },
            { email: { $regex: filter.search, $options: 'i' } },
        ];
    }

    if (filter.status) {
        queryFilter.status = filter.status;
    }

    if (filter.role) {
        queryFilter.role = filter.role;
    }

    return User.paginate(queryFilter, {
        ...options,
        select: '-password -emailVerificationToken -emailVerificationExpires',
    });
};

const updateUserStatusById = async (userId, status) => {
    const user = await User.findById(userId);

    if (!user) {
        throw ApiError.notFound(messages.CRUD.NOT_FOUND('User'));
    }

    if (!Object.values(USER_STATUS).includes(status)) {
        throw ApiError.badRequest('Trạng thái người dùng không hợp lệ');
    }

    user.status = status;
    await user.save();

    return user;
};

module.exports = {
    getProfileById,
    updateProfileById,
    changePasswordById,
    getUserList,
    updateUserStatusById,
};
