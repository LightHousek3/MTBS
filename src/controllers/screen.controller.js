const { screenService } = require('../services');
const { asyncHandler, ResponseHandler, pick } = require('../utils');
const { messages } = require('../constants');

const createScreen = asyncHandler(async (req, res) => {
    const screen = await screenService.createScreen(req.body);
    ResponseHandler.created(res, {
        message: messages.CRUD.CREATED('Screen'),
        data: screen,
    });
});

const getScreenList = asyncHandler(async (req, res) => {
    const filter = pick(req.query, ['theater', 'search']);
    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    const result = await screenService.getScreenList(filter, options);

    ResponseHandler.paginated(res, {
        message: messages.CRUD.LIST_FETCHED('Screens'),
        data: result.results,
        meta: result.meta,
    });
});

const getScreen = asyncHandler(async (req, res) => {
    const screen = await screenService.getScreenById(req.params.id);
    ResponseHandler.success(res, {
        message: messages.CRUD.FETCHED('Screen'),
        data: screen,
    });
});

const updateScreen = asyncHandler(async (req, res) => {
    const screen = await screenService.updateScreenById(req.params.id, req.body);
    ResponseHandler.success(res, {
        message: messages.CRUD.UPDATED('Screen'),
        data: screen,
    });
});

const deleteScreen = asyncHandler(async (req, res) => {
    const status = await screenService.deleteScreenById(req.params.id);
    if (status) {
        ResponseHandler.success(res, {
            message: messages.CRUD.DELETED('Screen'),
            data: { status },
        });
    } else {
        ResponseHandler.error(res, {
            message: messages.CRUD.DELETED_FAIL('Screen'),
        });
    }
});

module.exports = {
    createScreen,
    getScreenList,
    getScreen,
    updateScreen,
    deleteScreen,
};
