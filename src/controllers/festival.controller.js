const { festivalService } = require('../services');
const { asyncHandler, ResponseHandler, pick } = require('../utils');
const { messages } = require('../constants');

const createFestival = asyncHandler(async (req, res) => {
    const festival = await festivalService.createFestival(req.body);
    ResponseHandler.created(res, {
        message: messages.CRUD.CREATED('Festival'),
        data: festival,
    });
});

const getFestivalList = asyncHandler(async (req, res) => {
    const filter = pick(req.query, ['search']);
    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    const result = await festivalService.getFestivalList(filter, options);

    ResponseHandler.paginated(res, {
        message: messages.CRUD.LIST_FETCHED('Festivals'),
        data: result.results,
        meta: result.meta,
    });
});

const getFestival = asyncHandler(async (req, res) => {
    const festival = await festivalService.getFestivalById(req.params.id);
    ResponseHandler.success(res, {
        message: messages.CRUD.FETCHED('Festival'),
        data: festival,
    });
});

const updateFestival = asyncHandler(async (req, res) => {
    const festival = await festivalService.updateFestivalById(req.params.id, req.body);
    ResponseHandler.success(res, {
        message: messages.CRUD.UPDATED('Festival'),
        data: festival,
    });
});

const deleteFestival = asyncHandler(async (req, res) => {
    const status = await festivalService.deleteFestivalById(req.params.id);
    if (status) {
        ResponseHandler.success(res, {
            message: messages.CRUD.DELETED('Festival'),
            data: { status },
        });
    } else {
        ResponseHandler.error(res, {
            message: messages.CRUD.DELETED_FAIL('Festival'),
        });
    }
});

module.exports = {
    createFestival,
    getFestivalList,
    getFestival,
    updateFestival,
    deleteFestival,
};
