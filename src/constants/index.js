const httpStatus = require('./httpStatus');
const messages = require('./messages');

/**
 * Enums matching the database schema
 */
const USER_STATUS = {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    BLOCKED: 'BLOCKED',
};

const USER_GENDER = {
    MALE: 'MALE',
    FEMALE: 'FEMALE',
    OTHER: 'OTHER',
};

const USER_ROLE = {
    ADMIN: 'ADMIN',
    USER: 'USER',
};

const USER_AUTH_PROVIDER = {
    LOCAL: 'LOCAL',
    GOOGLE: 'GOOGLE',
    FACEBOOK: 'FACEBOOK',
};

const MOVIE_TYPE = {
    TWO_D: '2D',
    THREE_D: '3D',
};

const AGE_RATING = {
    P: 'P',
    K: 'K',
    T13: 'T13',
    T16: 'T16',
    T18: 'T18',
    C: 'C',
};

const SHOWTIME_STATUS = {
    UPCOMING: 'UPCOMING',
    NOW_SHOWING: 'NOW_SHOWING',
    ENDED: 'ENDED',
};

/**
 * Buffer time between showtimes in the same screen (in minutes)
 * This allows time for cleaning and preparation between shows
 * @constant {number}
 */
const SHOWTIME_BUFFER_MINUTES = 10;

const SEAT_STATUS = {
    AVAILABLE: 'AVAILABLE',
    UNAVAILABLE: 'UNAVAILABLE',
};

const SEAT_TYPE = {
    STANDARD: 'STANDARD',
    VIP: 'VIP',
    SWEETBOX: 'SWEETBOX',
};

const BANNER_TYPE = {
    IMAGE: 'IMAGE',
    VIDEO: 'VIDEO',
};

const SERVICE_STATUS = {
    AVAILABLE: 'AVAILABLE',
    INACTIVE: 'INACTIVE',
};

const SERVICE_TYPE = {
    POPCORN: 'POPCORN',
    DRINK: 'DRINK',
    COMBO: 'COMBO',
    OTHER: 'OTHER',
};

const DISCOUNT_TYPE = {
    AMOUNT: 'AMOUNT',
    PERCENT: 'PERCENT',
};

const PROMOTION_STATUS = {
    ACTIVE: 'ACTIVE',
    EXPIRED: 'EXPIRED',
    UPCOMING: 'UPCOMING',
};

const PAYMENT_METHOD = {
    VNPAY: 'VNPAY',
    MOMO: 'MOMO',
};

const PAYMENT_STATUS = {
    PENDING: 'PENDING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED',
};

const BOOKING_STATUS = {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    CANCELLED: 'CANCELLED',
};

/** Minutes a seat hold is reserved before auto-release */
const BOOKING_HOLD_MINUTES = 10;

const DAY_TYPE = {
    WEEKDAY: false,
    WEEKEND: true,
};

module.exports = {
    httpStatus,
    messages,
    USER_STATUS,
    USER_GENDER,
    USER_AUTH_PROVIDER,
    USER_ROLE,
    MOVIE_TYPE,
    AGE_RATING,
    SHOWTIME_STATUS,
    SHOWTIME_BUFFER_MINUTES,
    SEAT_STATUS,
    SEAT_TYPE,
    BANNER_TYPE,
    SERVICE_STATUS,
    SERVICE_TYPE,
    DISCOUNT_TYPE,
    PROMOTION_STATUS,
    PAYMENT_METHOD,
    PAYMENT_STATUS,
    BOOKING_STATUS,
    BOOKING_HOLD_MINUTES,
    DAY_TYPE,
};
