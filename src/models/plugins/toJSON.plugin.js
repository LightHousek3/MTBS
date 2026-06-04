/**
 * toJSON plugin - Transforms mongoose document output.
 * - Replaces _id with id
 * - Removes __v
 * - Removes fields marked as private in schema
 *
 * @param {mongoose.Schema} schema
 */
const toJSON = (schema) => {
    let transform;
    if (schema.options.toJSON && schema.options.toJSON.transform) {
        transform = schema.options.toJSON.transform;
    }

    schema.options.toJSON = Object.assign(schema.options.toJSON || {}, {
        transform(doc, ret, options) {
            // Remove private fields
            Object.keys(schema.paths).forEach((path) => {
                if (schema.paths[path].options && schema.paths[path].options.private) {
                    delete ret[path];
                }
            });

            // Replace _id with id
            ret.id = ret._id.toString();
            delete ret._id;
            delete ret.__v;

            // Remove soft-delete fields from output
            if (ret.isDeleted !== undefined) {
                delete ret.isDeleted;
                delete ret.deletedAt;
            }

            if (transform) {
                return transform(doc, ret, options);
            }
        },
    });
};

module.exports = toJSON;