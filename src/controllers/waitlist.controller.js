const { waitlistService } = require('../services');
const { asyncHandler, ResponseHandler, pick } = require('../utils');
const { messages } = require('../constants');

const addMovie = asyncHandler(async (req, res) => {
    const watchlistItem = await waitlistService.addMovie(req.user.id, req.body.movieId);

    ResponseHandler.created(res, {
        message: messages.CRUD.CREATED('Coming soon watchlist'),
        data: watchlistItem,
    });
});

const removeMovie = asyncHandler(async (req, res) => {
    await waitlistService.removeMovie(req.user.id, req.params.movieId);

    ResponseHandler.success(res, {
        message: messages.CRUD.DELETED('Coming soon watchlist'),
    });
});

const getWatchlist = asyncHandler(async (req, res) => {
    const options = pick(req.query, ['page', 'limit', 'includeReleased']);
    const result = await waitlistService.getWatchlist(req.user.id, options);

    ResponseHandler.paginated(res, {
        message: messages.CRUD.LIST_FETCHED('Coming soon watchlist'),
        data: result.results,
        meta: result.meta,
    });
});

const getWatchlistStatus = asyncHandler(async (req, res) => {
    const result = await waitlistService.getWatchlistStatus(req.user?.id, req.params.movieId);

    ResponseHandler.success(res, {
        message: messages.CRUD.FETCHED('Coming soon watchlist status'),
        data: result,
    });
});

module.exports = {
    addMovie,
    removeMovie,
    getWatchlist,
    getWatchlistStatus,
};
