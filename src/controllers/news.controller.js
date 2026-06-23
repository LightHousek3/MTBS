const { newsService } = require('../services');
const { asyncHandler, ResponseHandler, pick } = require('../utils');
const { messages } = require('../constants');

const createNews = asyncHandler(async (req, res) => {
    const news = await newsService.createNews(req.body);
    ResponseHandler.created(res, {
        message: messages.CRUD.CREATED('News'),
        data: news,
    });
});

const getNewsList = asyncHandler(async (req, res) => {
    const filter = pick(req.query, ['search']);
    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    const result = await newsService.getNewsList(filter, options);

    ResponseHandler.paginated(res, {
        message: messages.CRUD.LIST_FETCHED('News'),
        data: result.results,
        meta: result.meta,
    });
});

const getNews = asyncHandler(async (req, res) => {
    const news = await newsService.getNewsById(req.params.id);
    ResponseHandler.success(res, {
        message: messages.CRUD.FETCHED('News'),
        data: news,
    });
});

const updateNews = asyncHandler(async (req, res) => {
    const news = await newsService.updateNewsById(req.params.id, req.body);
    ResponseHandler.success(res, {
        message: messages.CRUD.UPDATED('News'),
        data: news,
    });
});

const deleteNews = asyncHandler(async (req, res) => {
    const status = await newsService.deleteNewsById(req.params.id);
    if (status) {
        ResponseHandler.success(res, {
            message: messages.CRUD.DELETED('News'),
            data: { status },
        });
    } else {
        ResponseHandler.error(res, {
            message: messages.CRUD.DELETED_FAIL('News'),
        });
    }
});

module.exports = {
    createNews,
    getNewsList,
    getNews,
    updateNews,
    deleteNews,
};
