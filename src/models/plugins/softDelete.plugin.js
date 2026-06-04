/**
 * Soft Delete plugin - Adds soft delete support to any Mongoose model.
 * Instead of removing documents, marks them as deleted with a timestamp.
 *
 * Adds:
 * - isDeleted (Boolean, default: false)
 * - deletedAt (Date)
 * - softDelete() instance method
 * - restore() instance method
 * - Modifies find queries to exclude soft-deleted by default
 *
 * @param {mongoose.Schema} schema
 */
const softDelete = (schema) => {
    schema.add({
        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        },
        deletedAt: {
            type: Date,
            default: null,
        },
    });

    /**
     * Soft delete a document
     */
    schema.methods.softDelete = async function () {
        this.isDeleted = true;
        this.deletedAt = new Date();
        return this.save();
    };

    /**
     * Restore a soft-deleted document
     */
    schema.methods.restore = async function () {
        this.isDeleted = false;
        this.deletedAt = null;
        return this.save();
    };

    /**
     * Static method to soft delete by ID
     */
    schema.statics.softDeleteById = async function (id) {
        const doc = await this.findByIdAndUpdate(
            id,
            {
                isDeleted: true,
                deletedAt: new Date(),
            },
            { new: true },
        );
        return !!doc;
    };

    /**
     * Static method to restore by ID
     */
    schema.statics.restoreById = async function (id) {
        return this.findByIdAndUpdate(
            id,
            {
                isDeleted: false,
                deletedAt: null,
            },
            { new: true },
        );
    };

    // Pre-find hooks: exclude soft-deleted documents by default
    const excludeDeleted = function (next) {
        if (this.getQuery().isDeleted === undefined) {
            this.where({ isDeleted: { $ne: true } });
        }
        next();
    };

    schema.pre('find', excludeDeleted);
    schema.pre('findOne', excludeDeleted);
    schema.pre('findOneAndUpdate', excludeDeleted);
    schema.pre('countDocuments', excludeDeleted);
    schema.pre('aggregate', function (next) {
        this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
        next();
    });
};

module.exports = softDelete;
