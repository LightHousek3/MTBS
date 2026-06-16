const { bannerService } = require('../services');
const { asyncHandler, ResponseHandler, pick } = require('../utils');
const { messages } = require('../constants');

const createBanner = asyncHandler(async (req, res) => {
    const banner = await bannerService.createBanner(req.body);
    ResponseHandler.created(res, {
        message: messages.CRUD.CREATED('Banner'),
        data: banner,
    });
});

const getBanners = asyncHandler(async (req, res) => {
    const filter = pick(req.query, ['type', 'search']);
    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    const result = await bannerService.getBanners(filter, options);

    ResponseHandler.paginated(res, {
        message: messages.CRUD.LIST_FETCHED('Banners'),
        data: result.results,
        meta: result.meta,
    });
});

const getBanner = asyncHandler(async (req, res) => {
    const banner = await bannerService.getBannerById(req.params.id);
    ResponseHandler.success(res, {
        message: messages.CRUD.FETCHED('Banner'),
        data: banner,
    });
});

const updateBanner = asyncHandler(async (req, res) => {
    const banner = await bannerService.updateBannerById(req.params.id, req.body);
    ResponseHandler.success(res, {
        message: messages.CRUD.UPDATED('Banner'),
        data: banner,
    });
});

const deleteBanner = asyncHandler(async (req, res) => {
    const status = await bannerService.deleteBannerById(req.params.id);
    if (status) {
        ResponseHandler.success(res, {
            message: messages.CRUD.DELETED('Banner'),
            data: { status },
        });
    } else {
        ResponseHandler.error(res, {
            message: messages.CRUD.DELETED_FAIL('Banner'),
        });
    }
});

module.exports = {
    createBanner,
    getBanners,
    getBanner,
    updateBanner,
    deleteBanner,
};
