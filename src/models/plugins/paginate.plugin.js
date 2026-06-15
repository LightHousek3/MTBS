/**
 * Paginate plugin - Adds pagination support to any Mongoose model.
 *
 * Usage:
 *   const result = await Model.paginate(filter, options);
 *
 * @param {mongoose.Schema} schema
 */
const paginate = (schema) => {
    /**
     * Query with pagination
     * @param {Object} [filter] - Mongoose filter query
     * @param {Object} [options] - Query options
     * @param {string} [options.sortBy] - Sort field:order (e.g., 'createdAt:desc')
     * @param {string} [options.populate] - Comma-separated populate paths
     * @param {number} [options.limit] - Results per page (default: 10, max: 100)
     * @param {number} [options.page] - Page number (default: 1)
     * @param {string} [options.select] - Fields to select
     * @returns {Promise<Object>} Paginated results
     */
    schema.statics.paginate = async function (filter = {}, options = {}) {
        let sort = {};
        if (options.sortBy) {
            options.sortBy.split(',').forEach((sortOption) => {
                const [key, order] = sortOption.split(':');
                sort[key] = order === 'desc' ? -1 : 1;
            });
        } else {
            sort = { createdAt: -1 };
        }

        const limit = Math.min(Math.max(parseInt(options.limit, 10) || 10, 1), 100);
        const page = Math.max(parseInt(options.page, 10) || 1, 1);
        const skip = (page - 1) * limit;

        // Build query
        let query = this.find(filter).sort(sort).skip(skip).limit(limit);

        // Select fields
        if (options.select) {
            query = query.select(options.select);
        }

        // Populate
        if (options.populate) {
            if (typeof options.populate === 'string') {
                // ex: showtime when populate = screen:name.theater:name-address,movie
                options.populate
                    .split(',')
                    .map((item) => item.trim())
                    .forEach((item) => {
                        query = query.populate(parsePopulate(item));
                    });
            } else {
                query = query.populate(options.populate);
            }
        }

        // Execute query and count in parallel
        const [results, totalResults] = await Promise.all([
            query.exec(),
            this.countDocuments(filter).exec(),
        ]);

        const totalPages = Math.ceil(totalResults / limit);

        return {
            results,
            meta: {
                page,
                limit,
                totalResults,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    };
};

const parsePopulate = (populateString) => {
    // ex: populateString = [screen:name.theater:name-address] or [movie]
    const levels = populateString.split('.');

    let result = null;

    for (let i = levels.length - 1; i >= 0; i--) {
        const [path, select] = levels[i].split(':');

        const populateObj = {
            path,
            ...(select && {
                select: select.split('-').join(' '),
            }),
        };

        if (result) {
            populateObj.populate = result;
        }

        result = populateObj;
    }

    return result;
};

module.exports = paginate;
