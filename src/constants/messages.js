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
        CREATED_FAIL: (resource) => `Tạo ${resource} thất bại`,
        UPDATED: (resource) => `Cập nhật ${resource} thành công`,
        UPDATED_FAIL: (resource) => `Cập nhật ${resource} thất bại`,
        DELETED: (resource) => `Xóa ${resource} thành công`,
        DELETED_FAIL: (resource) => `Xóa ${resource} thất bại`,
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
        INVALID_TIME_RANGE: 'Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc',
        SHOWTIME_START_TIME_IN_PAST: 'Không thể tạo hoặc cập nhật suất chiếu trong quá khứ',
        MOVIE_SCHEDULE_NOT_CONFIGURED: 'Phim chưa được cấu hình ngày khởi chiếu hoặc ngày kết thúc',
        SHOWTIME_OUTSIDE_MOVIE_RANGE: 'Suất chiếu phải nằm trong khoảng thời gian chiếu của phim',
        MOVIE_DURATION_NOT_CONFIGURED: 'Phim chưa được cấu hình thời lượng hợp lệ',
        SHOWTIME_SHORTER_THAN_MOVIE_DURATION: (duration) =>
            `Thời lượng suất chiếu phải lớn hơn hoặc bằng thời lượng phim (${duration} phút)`,
        SHOWTIME_OVERLAP_IN_SCREEN: (bufferMinutes) =>
            `Suất chiếu bị trùng lịch hoặc không đảm bảo ${bufferMinutes} phút chuẩn bị phòng`,
        SHOWTIME_HAS_ACTIVE_BOOKINGS:
            'Không thể cập nhật hoặc xóa suất chiếu đã có booking đang hoạt động',
        MOVIE_DATE_RANGE_CANNOT_SHRINK:
            'Không thể thu hẹp thời gian chiếu vì phim đã có suất chiếu nằm ngoài khoảng mới',
        MOVIE_HAS_ACTIVE_BOOKINGS: 'Không thể xóa phim đã có booking đang hoạt động',
        MOVIE_HAS_SHOWTIMES: 'Không thể xóa phim đã có suất chiếu',
    },

    // Server
    SERVER: {
        INTERNAL_ERROR: 'Lỗi máy chủ nội bộ',
        SERVICE_UNAVAILABLE: 'Dịch vụ tạm thời không khả dụng',
        TOO_MANY_REQUESTS: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
    },

    // Theater
    THEATER: {
        GEOCODE_SUCCESS: 'Cập nhật tọa độ rạp thành công',
        GEOCODE_NOT_FOUND:
            'Không thể xác định tọa độ cho địa chỉ đã cung cấp. Vui lòng thử một địa chỉ cụ thể hơn.',
        GEOCODE_SERVICE_ERROR:
            'Dịch vụ phân định vị trí tạm thời không khả dụng. Vui lòng thử lại sau.',
    },
    //Ticket Prices
    TICKETPRICE: {
        DUPLICATE: "Cấu hình giá vé với cùng loại ghế, loại phim, loại ngày và khoảng thời gian trùng lặp đã tồn tại",
        TIME_RANGE: "Thời gian bắt đầu phải trước thời gian kết thúc",
        NOT_FOUND: "Không tìm thấy giá vé",
    },

    // Booking
    BOOKING: {
        HAS_PENDING_BOOKING:
            'Bạn đang có một đơn đặt vé chưa thanh toán. Vui lòng hoàn tất hoặc hủy nó trước.',
        SEAT_UNAVAILABLE: 'Một hoặc nhiều ghế đã được đặt hoặc không khả dụng',
        SEAT_NOT_IN_SCREEN: 'Một hoặc nhiều ghế không thuộc phòng chiếu này',
        SHOWTIME_ENDED: 'Lịch chiếu này đã kết thúc',
        SHOWTIME_NOT_BOOKABLE: 'Lịch chiếu này chưa mở bán vé',
        BOOKING_SUCCESS: 'Đặt vé thành công',
        BOOKING_CANCELLED: 'Hủy vé thành công',
        BOOKING_NOT_FOUND: 'Không tìm thấy đơn đặt vé',
        ALREADY_BOOKED: 'Bạn đã có đơn đặt vé trực tiếp cho lịch chiếu này',
        CANNOT_CANCEL: 'Chỉ có thể hủy đơn đặt vé đang ở trạng thái chờ',
        EXPIRED: 'Đơn đặt vé đã hết hạn',
        NOT_OWNER: 'Bạn không có quyền truy cập đơn đặt vé này',
        TICKET_PRICE_NOT_FOUND:
            'Không tìm thấy giá vé cho loại ghế, loại phim và lịch chiếu này. Vui lòng liên hệ hỗ trợ.',
        SERVICE_NOT_AVAILABLE: 'Một hoặc nhiều dịch vụ đã chọn không khả dụng',
        SERVICE_NOT_IN_THEATER: 'Một hoặc nhiều dịch vụ không thuộc rạp chiếu này',
        PROMOTION_NOT_APPLICABLE: 'Mã khuyến mãi không áp dụng cho đơn đặt vé này',
    },

    // Payment
    PAYMENT: {
        SUCCESS: 'Thanh toán thành công',
        FAILED: 'Thanh toán thất bại',
        PENDING: 'Thanh toán đang chờ xử lý',
        NOT_FOUND: 'Không tìm thấy giao dịch thanh toán',
        ALREADY_PAID: 'Đơn đặt vé này đã được thanh toán',
        BOOKING_EXPIRED: 'Đơn đặt vé đã hết hạn. Vui lòng đặt vé mới.',
        INVALID_SIGNATURE: 'Chữ ký thanh toán không hợp lệ',
        VNPAY_URL_CREATED: 'Tạo đường dẫn thanh toán VNPay thành công',
    },
};

module.exports = messages;
