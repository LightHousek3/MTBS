const { userService } = require('../services');
const { asyncHandler, ResponseHandler, pick } = require('../utils');

const getProfile = asyncHandler(async (req, res) => {
    const user = await userService.getProfileById(req.user._id);

    ResponseHandler.success(res, {
        message: 'Lấy thông tin hồ sơ thành công',
        data: user,
    });
});

const updateProfile = asyncHandler(async (req, res) => {
    const updateBody = { ...req.body };
    if (req.file) {
        updateBody.avatar = `${req.protocol}://${req.get('host')}/uploads/avatars/${req.file.filename}`;
    }

    const user = await userService.updateProfileById(req.user._id, updateBody);

    ResponseHandler.success(res, {
        message: 'Cập nhật hồ sơ thành công',
        data: user,
    });
});

const changePassword = asyncHandler(async (req, res) => {
    const user = await userService.changePasswordById(req.user._id, req.body.currentPassword, req.body.newPassword);

    ResponseHandler.success(res, {
        message: 'Đổi mật khẩu thành công',
        data: user,
    });
});

const getUserList = asyncHandler(async (req, res) => {
    const filter = pick(req.query, ['search', 'status', 'role']);
    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    const result = await userService.getUserList(filter, options);

    ResponseHandler.paginated(res, {
        message: 'Lấy danh sách người dùng thành công',
        data: result.results,
        meta: result.meta,
    });
});

const updateUserStatus = asyncHandler(async (req, res) => {
    const user = await userService.updateUserStatusById(req.params.id, req.body.status);

    ResponseHandler.success(res, {
        message: 'Cập nhật trạng thái người dùng thành công',
        data: user,
    });
});

module.exports = {
    getProfile,
    updateProfile,
    changePassword,
    getUserList,
    updateUserStatus,
};
