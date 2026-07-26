const { User } = require('../models');
const { ApiError } = require('../utils');
const { messages, USER_STATUS, USER_AUTH_PROVIDER } = require('../constants');

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

    const authProviders = new Set((user.authProvider || []).map((provider) => provider.toUpperCase()));
    const isLocalOnly = authProviders.size === 1 && authProviders.has(USER_AUTH_PROVIDER.LOCAL);

    if (!user.password || !isLocalOnly) {
        throw ApiError.badRequest('Tài khoản liên kết mạng xã hội không hỗ trợ đổi mật khẩu trong hệ thống');
    }

    const isMatch = await user.isPasswordMatch(currentPassword);
    if (!isMatch) {
        throw ApiError.badRequest('Mật khẩu hiện tại không đúng');
    }

    const isSamePassword = await user.isPasswordMatch(newPassword);
    if (isSamePassword) {
        throw ApiError.badRequest('Mật khẩu mới không được trùng với mật khẩu hiện tại');
    }

    user.password = newPassword;
    await user.save();

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
