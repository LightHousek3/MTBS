/**
 * Centralized message constants
 */
const messages = {
    // Auth
    AUTH: {
        LOGIN_SUCCESS: 'Đăng nhập thành công',
        LOGOUT_SUCCESS: 'Đăng xuất thành công',
        REGISTER_SUCCESS: 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.',
        TOKEN_REFRESHED: 'Làm mới token thành công',
        INVALID_CREDENTIALS: 'Email hoặc mật khẩu không chính xác',
        UNAUTHORIZED: 'Vui lòng đăng nhập để tiếp tục',
        FORBIDDEN: 'Bạn không có quyền thực hiện hành động này',
        EMAIL_ALREADY_EXISTS: 'Email đã được đăng ký',
        EMAIL_NOT_VERIFIED: 'Vui lòng xác thực email để kích hoạt tài khoản',
        INVALID_REFRESH_TOKEN: 'Refresh token không hợp lệ hoặc đã hết hạn',
        ACCOUNT_BLOCKED: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ bộ phận hỗ trợ.',
        ACCOUNT_INACTIVE: 'Tài khoản chưa được kích hoạt. Vui lòng xác thực email trước.',
        VERIFICATION_EMAIL_SENT: 'Email xác thực đã được gửi. Vui lòng kiểm tra hộp thư đến.',
        EMAIL_VERIFIED: 'Xác thực email thành công. Tài khoản của bạn đã được kích hoạt!',
        INVALID_VERIFICATION_TOKEN: 'Mã xác thực không hợp lệ hoặc đã hết hạn',
        FORGOT_PASSWORD_SENT: 'Hướng dẫn đặt lại mật khẩu đã được gửi đến email của bạn.',
        EMAIL_NOT_FOUND: 'Email không tồn tại',
        RESET_PASSWORD_SUCCESS: 'Mật khẩu đã được đặt lại thành công.',
        INVALID_RESET_TOKEN: 'Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn',
        RESEND_VERIFICATION_SENT: 'Email xác thực đã được gửi lại thành công.',
        ALREADY_VERIFIED: 'Email này đã được xác thực trước đó.',
        RESEND_TOO_SOON: 'Vui lòng đợi một lát trước khi yêu cầu gửi lại email.',
    },

    // Generic CRUD
    CRUD: {
        CREATED: (resource) => `Tạo ${resource} thành công`,
        UPDATED: (resource) => `Cập nhật ${resource} thành công`,
        DELETED: (resource) => `Xóa ${resource} thành công`,
        FETCHED: (resource) => `Lấy thông tin ${resource} thành công`,
        NOT_FOUND: (resource) => `Không tìm thấy ${resource}`,
        ALREADY_EXISTS: (resource) => `${resource} đã tồn tại`,
        LIST_FETCHED: (resource) => `Lấy danh sách ${resource} thành công`,
    },

    // Validation
    VALIDATION: {
        FAILED: 'Xác thực dữ liệu thất bại',
        INVALID_OBJECT_ID: 'Định dạng ID không hợp lệ',
        REQUIRED_FIELD: (field) => `${field} là bắt buộc`,
    },

    // Server
    SERVER: {
        INTERNAL_ERROR: 'Lỗi máy chủ nội bộ',
        SERVICE_UNAVAILABLE: 'Dịch vụ tạm thời không khả dụng',
        TOO_MANY_REQUESTS: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
    },
};

module.exports = messages;
