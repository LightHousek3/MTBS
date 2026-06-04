const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { toJSON, paginate, softDelete } = require('./plugins');
const { USER_STATUS, USER_ROLE, USER_GENDER, USER_AUTH_PROVIDER } = require('../constants');

const userSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 10,
        },
        lastName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 10,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            maxlength: 50,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
        },
        password: {
            type: String,
            required: function () {
                return !this.googleId && !this.facebookId;
            },
            minlength: 6,
            private: true, // excluded from toJSON
        },
        googleId: {
            type: String,
            default: null,
            index: true,
        },
        facebookId: {
            type: String,
            default: null,
            index: true,
        },
        authProvider: {
            type: String,
            enum: Object.values(USER_AUTH_PROVIDER),
            default: USER_AUTH_PROVIDER.LOCAL,
        },
        avatar: {
            type: String,
            default: null,
        },
        address: {
            type: String,
            default: null,
        },
        phone: {
            type: String,
            trim: true,
            maxlength: 11,
            match: [/^[0-9]{10,11}$/, 'Please provide a valid phone number'],
            default: null,
        },
        age: {
            type: Number,
            default: null,
        },
        loyaltyPoints: {
            type: Number,
            default: 0,
        },
        gender: {
            type: String,
            enum: Object.values(USER_GENDER),
            default: USER_GENDER.OTHER,
        },
        emailVerificationToken: {
            type: String,
            private: true,
            default: null,
        },
        emailVerificationExpires: {
            type: Date,
            private: true,
            default: null,
        },
        status: {
            type: String,
            enum: Object.values(USER_STATUS),
            default: USER_STATUS.INACTIVE,
            index: true,
        },
        role: {
            type: String,
            enum: Object.values(USER_ROLE),
            default: USER_ROLE.USER,
            index: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    },
);

// ─── Indexes ─────────────────────────────────────────────
userSchema.index({ status: 1, role: 1 });

// ─── Plugins ─────────────────────────────────────────────
userSchema.plugin(toJSON);
userSchema.plugin(paginate);
userSchema.plugin(softDelete);

// ─── Virtual: fullName ───────────────────────────────────
userSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

// ─── Static: Check if email is taken ─────────────────────
userSchema.statics.isEmailTaken = async function (email, excludeUserId) {
    const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
    return !!user;
};

// ─── Method: Compare password ────────────────────────────
userSchema.methods.isPasswordMatch = async function (password) {
    return bcrypt.compare(password, this.password);
};

// ─── Pre-save: Hash password ─────────────────────────────
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
