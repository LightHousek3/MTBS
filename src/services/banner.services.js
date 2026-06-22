const { Banner } = require('../models');
const { ApiError } = require('../utils');
const { httpStatus, messages } = require('../constants');

const createBanner = async (body) => {
    const existing = await Banner.findOne({
        url: body.url,
    });
    if (existing) {
        throw ApiError.conflict(messages.CRUD.ALREADY_EXISTS('Banner'));
    }
    return Banner.create(body);
};

const getBanners = async (filter, options) => {
    const queryFilter = {};

    // Filter by type
    if (filter.type) {
        queryFilter.type = filter.type;
    }

    // Text search
    if (filter.search) {
        queryFilter.$or = [{ url: { $regex: filter.search, $options: 'i' } }];
    }
    return Banner.paginate(queryFilter, options);
};

const getBannerById = async (id) => {
    const banner = await Banner.findById(id);
    if (!banner) {
        throw ApiError.notFound(messages.CRUD.NOT_FOUND('Banner'));
    }
    return banner;
};

const updateBannerById = async (id, updateBody) => {
    const banner = await Banner.findById(id);
    if (!banner) {
        throw ApiError.notFound(messages.CRUD.NOT_FOUND('Banner'));
    }

    // Check if url is being updated and already exists
    if (updateBody.url && updateBody.url !== banner.url) {
        const existing = await Banner.findOne({
            url: updateBody.url,
        });
        if (existing) {
            throw ApiError.conflict(messages.CRUD.ALREADY_EXISTS('Banner with this URL'));
        }
    }

    Object.assign(banner, updateBody);
    banner.updatedAt = new Date();
    return banner.save();
};

const deleteBannerById = async (id) => {
    const status = await Banner.softDeleteById(id);
    return status;
};

module.exports = {
    createBanner,
    getBanners,
    getBannerById,
    updateBannerById,
    deleteBannerById,
};
