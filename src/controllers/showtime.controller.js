const { showtimeService } = require('../services');
const { asyncHandler, ResponseHandler, pick } = require('../utils');
const { messages } = require('../constants');

const createShowtime = asyncHandler(async (req, res) => {
    const showtime = await showtimeService.createShowtime(req.body);
    ResponseHandler.created(res, {
        message: messages.CRUD.CREATED('Showtime'),
        data: showtime,
    });
});

const getShowtimes = asyncHandler(async (req, res) => {
    const filter = pick(req.query, [
        'movie',
        'status',
        'date',
        'startTime',
        'endTime',
        'location',
        'theaterId',
        'theater',
    ]);
    const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);
    const result = await showtimeService.getShowtimes(filter, options);

    ResponseHandler.paginated(res, {
        message: messages.CRUD.LIST_FETCHED('Showtimes'),
        data: result.results,
        meta: result.meta,
    });
});

const getShowtime = asyncHandler(async (req, res) => {
    const options = pick(req.query, ['populate']);
    const showtime = await showtimeService.getShowtimeById(req.params.id, options);
    ResponseHandler.success(res, {
        message: messages.CRUD.FETCHED('Showtime'),
        data: showtime,
    });
});

const getShowtimeSeating = asyncHandler(async (req, res) => {
    const seating = await showtimeService.getShowtimeSeating(req.params.id);
    ResponseHandler.success(res, {
        message: messages.CRUD.FETCHED('Showtime Seating'),
        data: seating,
    });
});

const updateShowtime = asyncHandler(async (req, res) => {
    const showtime = await showtimeService.updateShowtimeById(req.params.id, req.body);
    ResponseHandler.success(res, {
        message: messages.CRUD.UPDATED('Showtime'),
        data: showtime,
    });
});

const deleteShowtime = asyncHandler(async (req, res) => {
    await showtimeService.deleteShowtimeById(req.params.id);
    ResponseHandler.success(res, {
        message: messages.CRUD.DELETED('Showtime'),
    });
});

module.exports = {
    createShowtime,
    getShowtimes,
    getShowtime,
    getShowtimeSeating,
    updateShowtime,
    deleteShowtime,
};
