const { seatService } = require('../services');
const { asyncHandler, ResponseHandler, pick } = require('../utils');
const { messages } = require('../constants');


// ─────────────────────────────────────────
// CREATE SEAT
// ─────────────────────────────────────────
const createSeat = asyncHandler(async (req, res) => {

    const seat = await seatService.createSeat(req.body);

    ResponseHandler.created(res, {
        message: messages.CRUD.CREATED('Seat'),
        data: seat
    });
});


// ─────────────────────────────────────────
// GET SEATS LIST
// ─────────────────────────────────────────
const getSeats = asyncHandler(async (req, res) => {

    const filter = pick(req.query, ['screenId']);
    const options = pick(req.query, ['sortBy', 'limit', 'page']);

    const result = await seatService.getSeats(filter, options);

    ResponseHandler.paginated(res, {
        message: messages.CRUD.LIST_FETCHED('Seats'),
        data: result.results,
        meta: result.meta
    });
});


// ─────────────────────────────────────────
// GET SEAT DETAIL
// ─────────────────────────────────────────
const getSeat = asyncHandler(async (req, res) => {

    const seat = await seatService.getSeatById(req.params.id);

    ResponseHandler.success(res, {
        message: messages.CRUD.FETCHED('Seat'),
        data: seat
    });
});


// ─────────────────────────────────────────
// UPDATE SEAT
// ─────────────────────────────────────────
const updateSeat = asyncHandler(async (req, res) => {

    const seat = await seatService.updateSeatById(
        req.params.id,
        req.body
    );

    ResponseHandler.success(res, {
        message: messages.CRUD.UPDATED('Seat'),
        data: seat
    });
});


// ─────────────────────────────────────────
// DELETE SEAT
// ─────────────────────────────────────────
const deleteSeat = asyncHandler(async (req, res) => {

    await seatService.deleteSeatById(req.params.id);

    ResponseHandler.success(res, {
        message: messages.CRUD.DELETED('Seat')
    });
});


// ─────────────────────────────────────────
// BLOCK / UNBLOCK SEAT
// ─────────────────────────────────────────
const updateSeatStatus = asyncHandler(async (req, res) => {

    const seat = await seatService.updateSeatStatus(
        req.params.id,
        req.body.status
    );

    ResponseHandler.success(res, {
        message: messages.CRUD.UPDATED('Seat status'),
        data: seat
    });
});


// ─────────────────────────────────────────
// CREATE SEATS BULK
// ─────────────────────────────────────────
const createSeatsBulk = asyncHandler(async (req, res) => {

    const seats = await seatService.createSeatsBulk(req.body.screenId, req.body.seats);

    ResponseHandler.created(res, {
        message: messages.CRUD.CREATED('Seats'),
        data: seats
    });
});


// ─────────────────────────────────────────
// UPDATE SEATS BULK
// ─────────────────────────────────────────
const updateSeatsBulk = asyncHandler(async (req, res) => {

    const seats = await seatService.updateSeatsBulk(req.body.screenId, req.body.updates);

    ResponseHandler.success(res, {
        message: messages.CRUD.UPDATED('Seats'),
        data: seats
    });
});


// ─────────────────────────────────────────
// DELETE SEATS BULK
// ─────────────────────────────────────────
const deleteSeatsBulk = asyncHandler(async (req, res) => {

    await seatService.deleteSeatsBulk(req.body.screenId, req.body.seatNumbers);

    ResponseHandler.success(res, {
        message: messages.CRUD.DELETED('Seats')
    });
});


module.exports = {
    createSeat,
    getSeats,
    getSeat,
    updateSeat,
    deleteSeat,
    updateSeatStatus,
    createSeatsBulk,
    updateSeatsBulk,
    deleteSeatsBulk
};