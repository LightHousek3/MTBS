const { bookingService } = require('../services');
const { statisticService } = require('../services');
const { asyncHandler, ResponseHandler, pick } = require('../utils');
const { messages } = require('../constants');

/**
 * POST /bookings
 * Create a booking (customer). Returns the booking + 10-minute hold.
 */
const createBooking = asyncHandler(async (req, res) => {
    const booking = await bookingService.createBooking(req.user.id, req.body);
    ResponseHandler.created(res, {
        message: messages.BOOKING.BOOKING_SUCCESS,
        data: booking,
    });
});

const getPendingBooking = asyncHandler(async (req, res) => {
    const booking = await bookingService.getPendingBooking(req.user.id);
    ResponseHandler.success(res, { data: booking });
});

const getBookingById = asyncHandler(async (req, res) => {
    const booking = await bookingService.getBookingById(req.params.id, req.user.id);
    ResponseHandler.success(res, { data: booking });
});

/**
 * PATCH /bookings/:id/cancel
 * Cancel a PENDING_PAYMENT booking (owner only).
 */
const cancelBooking = asyncHandler(async (req, res) => {
    const booking = await bookingService.cancelBooking(req.params.id, req.user.id);
    ResponseHandler.success(res, {
        message: messages.BOOKING.BOOKING_CANCELLED,
        data: booking,
    });
});

/**
 * GET /bookings/stats/overview (admin only)
 */
const getOverviewStats = asyncHandler(async (req, res) => {
    const stats = await statisticService.getOverviewStats();
    ResponseHandler.success(res, {
        message: messages.CRUD.FETCHED('Overview statistics'),
        data: stats,
    });
});

/**
 * GET /bookings/stats/revenue-by-genre (admin only)
 */
const getRevenueByGenre = asyncHandler(async (req, res) => {
    const { year } = pick(req.query, ['year']);
    const data = await statisticService.getRevenueByGenre(year);
    ResponseHandler.success(res, {
        message: messages.CRUD.FETCHED('Revenue by genre'),
        data,
    });
});

/**
 * GET /bookings/stats/revenue-by-month (admin only)
 */
const getRevenueByMonth = asyncHandler(async (req, res) => {
    const { year } = pick(req.query, ['year']);
    const data = await statisticService.getRevenueByMonth(year);
    ResponseHandler.success(res, {
        message: messages.CRUD.FETCHED('Revenue by month'),
        data,
    });
});

/**
 * GET /bookings/stats/revenue-by-year (admin only)
 */
const getRevenueByYear = asyncHandler(async (req, res) => {
    const { fromYear, toYear } = pick(req.query, ['fromYear', 'toYear']);
    const data = await statisticService.getRevenueByYear({ fromYear, toYear });
    ResponseHandler.success(res, {
        message: messages.CRUD.FETCHED('Revenue by year'),
        data,
    });
});

/**
 * GET /bookings/stats/revenue-by-theater (admin only)
 */
const getRevenueByTheater = asyncHandler(async (req, res) => {
    const { year } = pick(req.query, ['year']);
    const data = await statisticService.getRevenueByTheater(year);
    ResponseHandler.success(res, {
        message: messages.CRUD.FETCHED('Revenue by theater'),
        data,
    });
});

/**
 * GET /bookings/stats/export (admin only)
 * Returns a multi-sheet Excel workbook with all dashboard data.
 */
const exportDashboard = asyncHandler(async (req, res) => {
    const { startDate, endDate } = pick(req.query, ['startDate', 'endDate']);
    const wb = await statisticService.exportDashboard({ startDate, endDate });

    const filename = `dashboard_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await wb.xlsx.write(res);
    res.end();
});

module.exports = {
    createBooking,
    getPendingBooking,
    getBookingById,
    cancelBooking,
    getOverviewStats,
    getRevenueByGenre,
    getRevenueByMonth,
    getRevenueByYear,
    getRevenueByTheater,
    exportDashboard,
};
