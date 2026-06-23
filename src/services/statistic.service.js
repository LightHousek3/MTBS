const { Booking, Theater, Movie, User, Showtime, Payment, Seat, TicketPrice } = require('../models');
const { BOOKING_STATUS, USER_ROLE } = require('../constants');

// ── Helper ────────────────────────────────────────────────────
/**
 * Build a createdAt date-range filter from an optional year integer.
 */
const buildYearDateRange = (year) => {
    if (!year) return {};
    const from = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    const to = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0));
    return { createdAt: { $gte: from, $lt: to } };
};

// ── Public API ────────────────────────────────────────────────

/**
 * Admin: overview statistics for confirmed bookings.
 */
const getOverviewStats = async () => {
    const [bookingStats, totalTheaters, totalMovies, totalCustomers] = await Promise.all([
        Booking.aggregate([
            { $match: { status: BOOKING_STATUS.CONFIRMED } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$totalPrice' },
                    totalBookings: { $sum: 1 },
                    totalTickets: { $sum: { $size: '$seats' } },
                    averageBookingValue: { $avg: '$totalPrice' },
                },
            },
            {
                $project: {
                    _id: 0,
                    totalRevenue: 1,
                    totalBookings: 1,
                    totalTickets: 1,
                    averageBookingValue: { $round: ['$averageBookingValue', 2] },
                },
            },
        ]).then((res) => res[0]),
        Theater.countDocuments(),
        Movie.countDocuments(),
        User.countDocuments({ role: USER_ROLE.USER }),
    ]);

    const stats = bookingStats || {
        totalRevenue: 0,
        totalBookings: 0,
        totalTickets: 0,
        averageBookingValue: 0,
    };

    return { ...stats, totalTheaters, totalMovies, totalCustomers };
};

/**
 * Admin: revenue grouped by movie genre.
 */
const getRevenueByGenre = async (year) => {
    const dateRange = buildYearDateRange(year);

    return Booking.aggregate([
        { $match: { status: BOOKING_STATUS.CONFIRMED, ...dateRange } },
        {
            $lookup: {
                from: 'showtimes', localField: 'showtime',
                foreignField: '_id', as: 'showtime',
            },
        },
        { $unwind: '$showtime' },
        {
            $lookup: {
                from: 'movies', localField: 'showtime.movie',
                foreignField: '_id', as: 'movie',
            },
        },
        { $unwind: '$movie' },
        { $unwind: '$movie.genres' },
        {
            $lookup: {
                from: 'genres', localField: 'movie.genres',
                foreignField: '_id', as: 'genre',
            },
        },
        { $unwind: '$genre' },
        {
            $group: {
                _id: '$genre._id',
                genreName: { $first: '$genre.name' },
                totalRevenue: { $sum: '$totalPrice' },
                totalBookings: { $sum: 1 },
            },
        },
        {
            $project: {
                _id: 0,
                genreId: '$_id',
                genreName: 1,
                totalRevenue: 1,
                totalBookings: 1,
            },
        },
        { $sort: { totalRevenue: -1 } },
    ]);
};

/**
 * Admin: revenue grouped by month within the given year (defaults to current year).
 */
const getRevenueByMonth = async (year) => {
    const targetYear = year || new Date().getUTCFullYear();
    const dateRange = buildYearDateRange(targetYear);

    return Booking.aggregate([
        { $match: { status: BOOKING_STATUS.CONFIRMED, ...dateRange } },
        {
            $group: {
                _id: { month: { $month: '$createdAt' } },
                totalRevenue: { $sum: '$totalPrice' },
                totalBookings: { $sum: 1 },
                totalTickets: { $sum: { $size: '$seats' } },
            },
        },
        {
            $project: {
                _id: 0,
                month: '$_id.month',
                totalRevenue: 1,
                totalBookings: 1,
                totalTickets: 1,
            },
        },
        { $sort: { month: 1 } },
    ]);
};

/**
 * Admin: revenue grouped by year (defaults to last 5 years).
 */
const getRevenueByYear = async ({ fromYear, toYear } = {}) => {
    const nowYear = new Date().getUTCFullYear();
    const startYear = fromYear || nowYear - 4;
    const endYear = toYear || nowYear;

    const from = new Date(Date.UTC(startYear, 0, 1, 0, 0, 0, 0));
    const to = new Date(Date.UTC(endYear + 1, 0, 1, 0, 0, 0, 0));

    return Booking.aggregate([
        {
            $match: {
                status: BOOKING_STATUS.CONFIRMED,
                createdAt: { $gte: from, $lt: to },
            },
        },
        {
            $group: {
                _id: { year: { $year: '$createdAt' } },
                totalRevenue: { $sum: '$totalPrice' },
                totalBookings: { $sum: 1 },
                totalTickets: { $sum: { $size: '$seats' } },
            },
        },
        {
            $project: {
                _id: 0,
                year: '$_id.year',
                totalRevenue: 1,
                totalBookings: 1,
                totalTickets: 1,
            },
        },
        { $sort: { year: 1 } },
    ]);
};

/**
 * Admin: revenue grouped by theater.
 */
const getRevenueByTheater = async (year) => {
    const dateRange = buildYearDateRange(year);

    return Booking.aggregate([
        { $match: { status: BOOKING_STATUS.CONFIRMED, ...dateRange } },
        {
            $lookup: {
                from: 'showtimes', localField: 'showtime',
                foreignField: '_id', as: 'showtime',
            },
        },
        { $unwind: '$showtime' },
        {
            $lookup: {
                from: 'screens', localField: 'showtime.screen',
                foreignField: '_id', as: 'screen',
            },
        },
        { $unwind: '$screen' },
        {
            $lookup: {
                from: 'theaters', localField: 'screen.theater',
                foreignField: '_id', as: 'theater',
            },
        },
        { $unwind: '$theater' },
        {
            $group: {
                _id: '$theater._id',
                theaterName: { $first: '$theater.name' },
                totalRevenue: { $sum: '$totalPrice' },
                totalBookings: { $sum: 1 },
                totalTickets: { $sum: { $size: '$seats' } },
            },
        },
        {
            $project: {
                _id: 0,
                theaterId: '$_id',
                theaterName: 1,
                totalRevenue: 1,
                totalBookings: 1,
                totalTickets: 1,
            },
        },
        { $sort: { totalRevenue: -1 } },
    ]);
};

/**
 * Admin: export full dashboard as a richly-formatted multi-sheet Excel workbook.
 */
const exportDashboard = async ({ startDate, endDate } = {}) => {
    const ExcelJS = require('exceljs');

    // Helper functions
    const toVietnamHHMM = (date) => {
        const hh = String(date.getUTCHours()).padStart(2, '0');
        const mm = String(date.getUTCMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
    };

    const formatVietnamDate = (date) => {
        if (!date) return '';
        try {
            const formatter = new Intl.DateTimeFormat('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            return formatter.format(date);
        } catch (e) {
            const d = new Date(date.getTime() + 7 * 60 * 60 * 1000);
            const day = String(d.getUTCDate()).padStart(2, '0');
            const month = String(d.getUTCMonth() + 1).padStart(2, '0');
            const year = d.getUTCFullYear();
            return `${day}/${month}/${year}`;
        }
    };

    // Resolve start and end dates
    let start = startDate ? new Date(startDate) : null;
    let end = endDate ? new Date(endDate) : null;

    if (!start || !end) {
        const minMax = await Booking.aggregate([
            { $match: { status: BOOKING_STATUS.CONFIRMED } },
            {
                $group: {
                    _id: null,
                    minDate: { $min: '$createdAt' },
                    maxDate: { $max: '$createdAt' },
                },
            },
        ]);
        if (minMax.length > 0) {
            if (!start) start = minMax[0].minDate;
            if (!end) end = minMax[0].maxDate;
        } else {
            const now = new Date();
            if (!start) start = new Date(now.getFullYear(), now.getMonth(), 1);
            if (!end) end = now;
        }
    }

    const adjustedEnd = new Date(end);
    adjustedEnd.setHours(23, 59, 59, 999);

    const [bookingStats, totalTheaters, totalMovies, newCustomers] = await Promise.all([
        Booking.aggregate([
            { $match: { createdAt: { $gte: start, $lte: adjustedEnd } } },
            {
                $group: {
                    _id: null,
                    totalRevenue: {
                        $sum: {
                            $cond: [{ $eq: ['$status', BOOKING_STATUS.CONFIRMED] }, '$totalPrice', 0]
                        }
                    },
                    totalBookings: { $sum: 1 },
                    totalTickets: {
                        $sum: {
                            $cond: [{ $eq: ['$status', BOOKING_STATUS.CONFIRMED] }, { $size: '$seats' }, 0]
                        }
                    },
                    confirmedCount: {
                        $sum: {
                            $cond: [{ $eq: ['$status', BOOKING_STATUS.CONFIRMED] }, 1, 0]
                        }
                    },
                    cancelledCount: {
                        $sum: {
                            $cond: [{ $eq: ['$status', BOOKING_STATUS.CANCELLED] }, 1, 0]
                        }
                    },
                },
            },
        ]).then((res) => res[0] || {
            totalRevenue: 0,
            totalBookings: 0,
            totalTickets: 0,
            confirmedCount: 0,
            cancelledCount: 0,
        }),
        Theater.countDocuments(),
        Movie.countDocuments(),
        User.countDocuments({ role: USER_ROLE.USER, createdAt: { $gte: start, $lte: adjustedEnd } }),
    ]);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'MTBS Admin';
    wb.created = new Date();

    const NAVY = 'FF1F3864';
    const BLUE = 'FF2E75B6';
    const LIGHT = 'FFD9E1F2';
    const WHITE = 'FFFFFFFF';
    const GRAY = 'FFF2F2F2';
    const GREEN = 'FF375623';
    const RED = 'FF833C00';
    const VND_FMT = '#,##0';
    const PCT_FMT = '0.00%';

    const applyTitleRow = (ws, title, colspan) => {
        const row = ws.addRow([title]);
        ws.mergeCells(row.number, 1, row.number, colspan);
        const cell = row.getCell(1);
        cell.font = { bold: true, size: 14, color: { argb: WHITE } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        row.height = 28;
    };

    const applySubtitle = (ws, text, colspan) => {
        const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        const row = ws.addRow([`${text}  |  Xuất lúc: ${now}`]);
        ws.mergeCells(row.number, 1, row.number, colspan);
        const cell = row.getCell(1);
        cell.font = { italic: true, size: 10, color: { argb: 'FF595959' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        row.height = 18;
        ws.addRow([]);
    };

    const applyHeader = (ws, headers) => {
        const row = ws.addRow(headers.map((h) => h.label));
        row.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: WHITE }, size: 11 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = {
                top: { style: 'medium', color: { argb: NAVY } },
                bottom: { style: 'medium', color: { argb: NAVY } },
                left: { style: 'thin', color: { argb: NAVY } },
                right: { style: 'thin', color: { argb: NAVY } },
            };
        });
        row.height = 24;
        ws.autoFilter = { from: { row: row.number, column: 1 }, to: { row: row.number, column: headers.length } };
        ws.views = [{ state: 'frozen', ySplit: row.number }];
        return row;
    };

    const applyDataRow = (row, isEven, fmts = [], aligns = []) => {
        row.height = 20;
        row.eachCell((cell, col) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? GRAY : WHITE } };
            cell.alignment = { vertical: 'middle', horizontal: aligns[col - 1] || 'left' };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
                bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
                left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
                right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            };
            if (fmts[col - 1]) cell.numFmt = fmts[col - 1];
        });
    };

    const applyTotalRow = (ws, values, fmts = [], aligns = []) => {
        ws.addRow([]);
        const row = ws.addRow(values);
        row.height = 22;
        row.eachCell((cell, col) => {
            cell.font = { bold: true, color: { argb: WHITE } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
            cell.alignment = { horizontal: aligns[col - 1] || (col === 1 ? 'left' : 'center'), vertical: 'middle' };
            cell.border = {
                top: { style: 'medium', color: { argb: BLUE } },
                bottom: { style: 'medium', color: { argb: BLUE } },
                left: { style: 'thin', color: { argb: NAVY } },
                right: { style: 'thin', color: { argb: NAVY } },
            };
            if (fmts[col - 1]) cell.numFmt = fmts[col - 1];
        });
    };

    // ── Sheet 1 - Dashboard Summary ───────────────────────────
    const ws1 = wb.addWorksheet('📊 Tổng quan');
    ws1.columns = [{ key: 'label', width: 36 }, { key: 'value', width: 26 }, { key: 'unit', width: 14 }];
    applyTitleRow(ws1, 'BÁO CÁO THỐNG KÊ DOANH THU', 3);
    applySubtitle(ws1, `Thời gian: ${formatVietnamDate(start)} - ${formatVietnamDate(end)}`, 3);

    const secRow = ws1.addRow(['CHỈ SỐ', 'GIÁ TRỊ', 'ĐƠN VỊ']);
    secRow.eachCell((c) => {
        c.font = { bold: true, color: { argb: WHITE } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });
    secRow.height = 22;

    const ovData = [
        ['Tổng doanh thu', bookingStats.totalRevenue, 'VNĐ'],
        ['Tổng booking', bookingStats.totalBookings, 'đơn'],
        ['Vé đã bán', bookingStats.totalTickets, 'vé'],
        ['Thanh toán thành công', bookingStats.confirmedCount, 'đơn'],
        ['Booking hủy', bookingStats.cancelledCount, 'đơn'],
        ['Khách hàng mới', newCustomers, 'khách'],
    ];

    ovData.forEach(([label, value, unit], i) => {
        const row = ws1.addRow([label, value, unit]);
        applyDataRow(row, i % 2 === 1, [null, VND_FMT, null], ['left', 'right', 'center']);
        row.getCell(1).font = { bold: true };
        if (i === 0) row.getCell(2).font = { color: { argb: GREEN }, bold: true };
    });

    // ── Sheet 2 - Revenue Report ──────────────────────────────
    const ws2 = wb.addWorksheet('📅 Báo cáo doanh thu');
    ws2.columns = [
        { key: 'date', width: 18 },
        { key: 'bookingCount', width: 16 },
        { key: 'ticketsCount', width: 16 },
        { key: 'revenue', width: 24 }
    ];
    applyTitleRow(ws2, 'BÁO CÁO DOANH THU HÀNG NGÀY', 4);
    applySubtitle(ws2, `Thời gian: ${formatVietnamDate(start)} - ${formatVietnamDate(end)}`, 4);
    applyHeader(ws2, [
        { label: 'Ngày' },
        { label: 'Booking' },
        { label: 'Vé bán' },
        { label: 'Doanh thu' }
    ]);

    const dailyRows = await Booking.aggregate([
        {
            $match: {
                status: BOOKING_STATUS.CONFIRMED,
                createdAt: { $gte: start, $lte: adjustedEnd }
            }
        },
        {
            $group: {
                _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Ho_Chi_Minh' }
                },
                bookingCount: { $sum: 1 },
                ticketsCount: { $sum: { $size: '$seats' } },
                revenue: { $sum: '$totalPrice' }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    dailyRows.forEach((r, i) => {
        const [y, m, d] = r._id.split('-');
        const dateFormatted = `${d}/${m}`;
        const row = ws2.addRow([dateFormatted, r.bookingCount, r.ticketsCount, r.revenue]);
        applyDataRow(row, i % 2 === 1, [null, null, null, VND_FMT], ['center', 'center', 'center', 'right']);
    });

    const totalRev = dailyRows.reduce((s, r) => s + r.revenue, 0);
    const totalBookingsCount = dailyRows.reduce((s, r) => s + r.bookingCount, 0);
    const totalTicketsCount = dailyRows.reduce((s, r) => s + r.ticketsCount, 0);

    applyTotalRow(ws2,
        ['Tổng doanh thu', totalBookingsCount, totalTicketsCount, totalRev],
        [null, null, null, VND_FMT],
        ['left', 'center', 'center', 'right']
    );

    // ── Sheet 3 - Ticket Statistics ───────────────────────────
    const ws3 = wb.addWorksheet('🎟️ Thống kê vé');
    ws3.columns = [
        { key: 'ticketType', width: 26 },
        { key: 'price', width: 20 },
        { key: 'soldCount', width: 16 },
        { key: 'revenue', width: 24 }
    ];
    applyTitleRow(ws3, 'THỐNG KÊ DOANH THU THEO LOẠI VÉ', 4);
    applySubtitle(ws3, `Thời gian: ${formatVietnamDate(start)} - ${formatVietnamDate(end)}`, 4);
    applyHeader(ws3, [
        { label: 'Loại vé' },
        { label: 'Giá' },
        { label: 'Đã bán' },
        { label: 'Doanh thu' }
    ]);

    const ticketStats = await Booking.aggregate([
        {
            $match: {
                status: BOOKING_STATUS.CONFIRMED,
                createdAt: { $gte: start, $lte: adjustedEnd }
            }
        },
        { $unwind: '$seats' },
        {
            $lookup: {
                from: 'seats',
                localField: 'seats.seat',
                foreignField: '_id',
                as: 'seatDetails'
            }
        },
        { $unwind: '$seatDetails' },
        {
            $group: {
                _id: '$seatDetails.type',
                soldCount: { $sum: 1 },
                revenue: { $sum: '$seats.finalPrice' }
            }
        },
        { $sort: { revenue: -1 } }
    ]);

    const typeMapping = {
        'STANDARD': 'Vé thường',
        'VIP': 'Vé VIP',
        'SWEETBOX': 'Vé đôi (Sweetbox)'
    };

    ticketStats.forEach((r, i) => {
        const typeName = typeMapping[r._id] || r._id;
        const avgPrice = r.soldCount > 0 ? r.revenue / r.soldCount : 0;
        const row = ws3.addRow([typeName, avgPrice, r.soldCount, r.revenue]);
        applyDataRow(row, i % 2 === 1, [null, VND_FMT, null, VND_FMT], ['left', 'right', 'center', 'right']);
    });

    const totalTicketsSold = ticketStats.reduce((s, r) => s + r.soldCount, 0);
    const totalTicketRev = ticketStats.reduce((s, r) => s + r.revenue, 0);
    applyTotalRow(ws3,
        ['TỔNG CỘNG', '', totalTicketsSold, totalTicketRev],
        [null, null, null, VND_FMT],
        ['left', 'center', 'center', 'right']
    );

    // ── Sheet 4 - Time Slot Statistics ────────────────────────
    const ws4 = wb.addWorksheet('🕒 Thống kê khung giờ');
    ws4.columns = [
        { key: 'slot', width: 24 },
        { key: 'price', width: 20 },
        { key: 'bookings', width: 16 },
        { key: 'tickets', width: 16 },
        { key: 'revenue', width: 24 }
    ];
    applyTitleRow(ws4, 'THỐNG KÊ DOANH THU THEO KHUNG GIỜ', 5);
    applySubtitle(ws4, `Thời gian: ${formatVietnamDate(start)} - ${formatVietnamDate(end)}`, 5);
    applyHeader(ws4, [
        { label: 'Khung giờ' },
        { label: 'Giá vé TB' },
        { label: 'Booking' },
        { label: 'Vé bán' },
        { label: 'Doanh thu' }
    ]);

    const priceConfigs = await TicketPrice.find({ isDeleted: false }).lean();
    const timeSlots = [];
    const slotSet = new Set();
    for (const config of priceConfigs) {
        const key = `${config.startTime} - ${config.endTime}`;
        if (!slotSet.has(key)) {
            slotSet.add(key);
            timeSlots.push({
                startTime: config.startTime,
                endTime: config.endTime,
                label: key
            });
        }
    }
    timeSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (timeSlots.length === 0) {
        timeSlots.push(
            { startTime: '08:00', endTime: '12:00', label: '08:00 - 12:00' },
            { startTime: '12:00', endTime: '17:00', label: '12:00 - 17:00' },
            { startTime: '17:00', endTime: '22:00', label: '17:00 - 22:00' },
            { startTime: '22:00', endTime: '08:00', label: '22:00 - 08:00' }
        );
    }

    const slotStats = timeSlots.map(slot => ({
        ...slot,
        bookingCount: 0,
        ticketsCount: 0,
        revenue: 0,
        ticketRevenueSum: 0,
    }));

    const isTimeInSlot = (timeStr, startTime, endTime) => {
        if (startTime < endTime) {
            return timeStr >= startTime && timeStr < endTime;
        } else {
            return timeStr >= startTime || timeStr < endTime;
        }
    };

    const bookingsForSlots = await Booking.find({
        status: BOOKING_STATUS.CONFIRMED,
        createdAt: { $gte: start, $lte: adjustedEnd }
    }).populate('showtime').lean();

    for (const b of bookingsForSlots) {
        if (!b.showtime) continue;
        const hhmm = toVietnamHHMM(b.showtime.startTime);
        const slot = slotStats.find(s => isTimeInSlot(hhmm, s.startTime, s.endTime));
        if (slot) {
            slot.bookingCount += 1;
            slot.ticketsCount += (b.seats?.length || 0);
            slot.revenue += (b.totalPrice || 0);
            slot.ticketRevenueSum += (b.totalPriceMovie || 0);
        }
    }

    slotStats.forEach((r, i) => {
        const avgPrice = r.ticketsCount > 0 ? r.ticketRevenueSum / r.ticketsCount : 0;
        const row = ws4.addRow([r.label, avgPrice, r.bookingCount, r.ticketsCount, r.revenue]);
        applyDataRow(row, i % 2 === 1, [null, VND_FMT, null, null, VND_FMT], ['center', 'right', 'center', 'center', 'right']);
    });

    const totalSlotBookings = slotStats.reduce((s, r) => s + r.bookingCount, 0);
    const totalSlotTickets = slotStats.reduce((s, r) => s + r.ticketsCount, 0);
    const totalSlotRev = slotStats.reduce((s, r) => s + r.revenue, 0);
    applyTotalRow(ws4,
        ['TỔNG CỘNG', '', totalSlotBookings, totalSlotTickets, totalSlotRev],
        [null, null, null, null, VND_FMT],
        ['left', 'center', 'center', 'center', 'right']
    );

    // ── Sheet 5 - Payment Statistics ──────────────────────────
    const ws5 = wb.addWorksheet('💳 Thống kê thanh toán');
    ws5.columns = [
        { key: 'method', width: 24 },
        { key: 'txCount', width: 20 },
        { key: 'revenue', width: 24 }
    ];
    applyTitleRow(ws5, 'THỐNG KÊ DOANH THU THEO PHƯƠNG THỨC THANH TOÁN', 3);
    applySubtitle(ws5, `Thời gian: ${formatVietnamDate(start)} - ${formatVietnamDate(end)}`, 3);
    applyHeader(ws5, [
        { label: 'Phương thức' },
        { label: 'Số giao dịch' },
        { label: 'Doanh thu' }
    ]);

    const paymentStats = await Payment.aggregate([
        {
            $match: {
                paymentStatus: 'COMPLETED',
                createdAt: { $gte: start, $lte: adjustedEnd }
            }
        },
        {
            $group: {
                _id: '$paymentMethod',
                txCount: { $sum: 1 },
                revenue: { $sum: '$amount' }
            }
        },
        { $sort: { revenue: -1 } }
    ]);

    const methodMapping = {
        'VNPAY': 'VNPay',
        'MOMO': 'MoMo',
        'ZALOPAY': 'ZaloPay'
    };

    paymentStats.forEach((r, i) => {
        const methodName = methodMapping[r._id] || r._id;
        const row = ws5.addRow([methodName, r.txCount, r.revenue]);
        applyDataRow(row, i % 2 === 1, [null, null, VND_FMT], ['left', 'center', 'right']);
    });

    const totalTxCount = paymentStats.reduce((s, r) => s + r.txCount, 0);
    const totalPaymentRev = paymentStats.reduce((s, r) => s + r.revenue, 0);
    applyTotalRow(ws5,
        ['TỔNG CỘNG', totalTxCount, totalPaymentRev],
        [null, null, VND_FMT],
        ['left', 'center', 'right']
    );

    // ── Thống kê phim ────────────────────────────
    const wsMovie = wb.addWorksheet('🎬 Thống kê phim');
    wsMovie.columns = [
        { key: 'movie', width: 40 },
        { key: 'bookings', width: 16 },
        { key: 'tickets', width: 16 },
        { key: 'revenue', width: 24 }
    ];
    applyTitleRow(wsMovie, 'THỐNG KÊ DOANH THU THEO PHIM', 4);
    applySubtitle(wsMovie, `Thời gian: ${formatVietnamDate(start)} - ${formatVietnamDate(end)}`, 4);
    applyHeader(wsMovie, [
        { label: 'Tên phim' },
        { label: 'Số Booking' },
        { label: 'Vé bán' },
        { label: 'Doanh thu' }
    ]);

    const movieStats = await Booking.aggregate([
        {
            $match: {
                status: BOOKING_STATUS.CONFIRMED,
                createdAt: { $gte: start, $lte: adjustedEnd }
            }
        },
        { $lookup: { from: 'showtimes', localField: 'showtime', foreignField: '_id', as: 'st' } },
        { $unwind: '$st' },
        { $lookup: { from: 'movies', localField: 'st.movie', foreignField: '_id', as: 'mv' } },
        { $unwind: '$mv' },
        {
            $group: {
                _id: '$mv.title',
                bookings: { $sum: 1 },
                tickets: { $sum: { $size: '$seats' } },
                revenue: { $sum: '$totalPrice' }
            }
        },
        { $sort: { revenue: -1 } }
    ]);

    movieStats.forEach((r, i) => {
        const row = wsMovie.addRow([r._id, r.bookings, r.tickets, r.revenue]);
        applyDataRow(row, i % 2 === 1, [null, null, null, VND_FMT], ['left', 'center', 'center', 'right']);
    });

    const totalMovieBookings = movieStats.reduce((s, r) => s + r.bookings, 0);
    const totalMovieTickets = movieStats.reduce((s, r) => s + r.tickets, 0);
    const totalMovieRev = movieStats.reduce((s, r) => s + r.revenue, 0);
    applyTotalRow(wsMovie,
        ['TỔNG CỘNG', totalMovieBookings, totalMovieTickets, totalMovieRev],
        [null, null, null, VND_FMT],
        ['left', 'center', 'center', 'right']
    );

    // ── Thống kê rạp ──────────────────────────
    const wsTheater = wb.addWorksheet('🏢 Thống kê rạp');
    wsTheater.columns = [
        { key: 'theater', width: 40 },
        { key: 'bookings', width: 16 },
        { key: 'tickets', width: 16 },
        { key: 'revenue', width: 24 }
    ];
    applyTitleRow(wsTheater, 'THỐNG KÊ DOANH THU THEO RẠP', 4);
    applySubtitle(wsTheater, `Thời gian: ${formatVietnamDate(start)} - ${formatVietnamDate(end)}`, 4);
    applyHeader(wsTheater, [
        { label: 'Tên rạp' },
        { label: 'Số Booking' },
        { label: 'Vé bán' },
        { label: 'Doanh thu' }
    ]);

    const theaterStats = await Booking.aggregate([
        {
            $match: {
                status: BOOKING_STATUS.CONFIRMED,
                createdAt: { $gte: start, $lte: adjustedEnd }
            }
        },
        { $lookup: { from: 'showtimes', localField: 'showtime', foreignField: '_id', as: 'st' } },
        { $unwind: '$st' },
        { $lookup: { from: 'screens', localField: 'st.screen', foreignField: '_id', as: 'scr' } },
        { $unwind: '$scr' },
        { $lookup: { from: 'theaters', localField: 'scr.theater', foreignField: '_id', as: 'th' } },
        { $unwind: '$th' },
        {
            $group: {
                _id: '$th.name',
                bookings: { $sum: 1 },
                tickets: { $sum: { $size: '$seats' } },
                revenue: { $sum: '$totalPrice' }
            }
        },
        { $sort: { revenue: -1 } }
    ]);

    theaterStats.forEach((r, i) => {
        const row = wsTheater.addRow([r._id, r.bookings, r.tickets, r.revenue]);
        applyDataRow(row, i % 2 === 1, [null, null, null, VND_FMT], ['left', 'center', 'center', 'right']);
    });

    const totalTheaterBookings = theaterStats.reduce((s, r) => s + r.bookings, 0);
    const totalTheaterTickets = theaterStats.reduce((s, r) => s + r.tickets, 0);
    const totalTheaterRev = theaterStats.reduce((s, r) => s + r.revenue, 0);
    applyTotalRow(wsTheater,
        ['TỔNG CỘNG', totalTheaterBookings, totalTheaterTickets, totalTheaterRev],
        [null, null, null, VND_FMT],
        ['left', 'center', 'center', 'right']
    );

    // ── Thống kê dịch vụ (Bắp nước) ───────────
    const wsService = wb.addWorksheet('🍿 Thống kê dịch vụ');
    wsService.columns = [
        { key: 'service', width: 40 },
        { key: 'qty', width: 16 },
        { key: 'revenue', width: 24 }
    ];
    applyTitleRow(wsService, 'THỐNG KÊ DOANH THU DỊCH VỤ (BẮP/NƯỚC)', 3);
    applySubtitle(wsService, `Thời gian: ${formatVietnamDate(start)} - ${formatVietnamDate(end)}`, 3);
    applyHeader(wsService, [
        { label: 'Tên dịch vụ' },
        { label: 'Số lượng bán' },
        { label: 'Doanh thu' }
    ]);

    const serviceStats = await Booking.aggregate([
        {
            $match: {
                status: BOOKING_STATUS.CONFIRMED,
                createdAt: { $gte: start, $lte: adjustedEnd }
            }
        },
        { $unwind: { path: '$services', preserveNullAndEmptyArrays: false } },
        { $lookup: { from: 'services', localField: 'services.service', foreignField: '_id', as: 'srv' } },
        { $unwind: '$srv' },
        {
            $group: {
                _id: '$srv.name',
                qty: { $sum: '$services.quantity' },
                revenue: { $sum: '$services.finalTotal' }
            }
        },
        { $sort: { revenue: -1 } }
    ]);

    serviceStats.forEach((r, i) => {
        const row = wsService.addRow([r._id, r.qty, r.revenue]);
        applyDataRow(row, i % 2 === 1, [null, null, VND_FMT], ['left', 'center', 'right']);
    });

    const totalServiceQty = serviceStats.reduce((s, r) => s + r.qty, 0);
    const totalServiceRev = serviceStats.reduce((s, r) => s + r.revenue, 0);
    applyTotalRow(wsService,
        ['TỔNG CỘNG', totalServiceQty, totalServiceRev],
        [null, null, VND_FMT],
        ['left', 'center', 'right']
    );

    // ── Chi tiết đặt chỗ ─────────────────────────────
    const ws6 = wb.addWorksheet('📋 Chi tiết đặt chỗ');
    ws6.columns = [
        { key: 'id', width: 16 },
        { key: 'customer', width: 28 },
        { key: 'showDate', width: 18 },
        { key: 'ticketType', width: 24 },
        { key: 'totalPrice', width: 20 },
        { key: 'paymentMethod', width: 16 },
        { key: 'status', width: 18 }
    ];
    applyTitleRow(ws6, 'DANH SÁCH CHI TIẾT ĐƠN ĐẶT CHỖ', 7);
    applySubtitle(ws6, `Thời gian: ${formatVietnamDate(start)} - ${formatVietnamDate(end)}`, 7);
    applyHeader(ws6, [
        { label: 'Mã Booking' },
        { label: 'Khách hàng' },
        { label: 'Ngày tham quan' },
        { label: 'Loại vé' },
        { label: 'Tổng tiền' },
        { label: 'Thanh toán' },
        { label: 'Trạng thái' }
    ]);

    const detailedBookings = await Booking.find({
        createdAt: { $gte: start, $lte: adjustedEnd }
    })
        .populate('user')
        .populate('showtime')
        .populate({ path: 'seats.seat' })
        .sort({ createdAt: -1 })
        .lean();

    const bookingIds = detailedBookings.map(b => b._id);
    const paymentsForMap = await Payment.find({ bookingId: { $in: bookingIds } }).lean();
    const paymentMap = new Map(paymentsForMap.map(p => [String(p.bookingId), p]));

    const statusMapping = {
        'CONFIRMED': 'Đã xác nhận',
        'PENDING': 'Chờ thanh toán',
        'CANCELLED': 'Đã hủy',
        'REFUNDED': 'Đã hoàn tiền'
    };

    detailedBookings.forEach((b, i) => {
        const shortId = String(b._id).toUpperCase().slice(-8);
        const customerName = b.user
            ? `${b.user.lastName || ''} ${b.user.firstName || ''}`.trim() || b.user.email
            : 'N/A';
        const showDateFormatted = b.showtime ? formatVietnamDate(b.showtime.startTime) : 'N/A';

        const seatTypes = b.seats.map(s => {
            const type = s.seat?.type || 'STANDARD';
            if (type === 'STANDARD') return 'Thường';
            if (type === 'VIP') return 'VIP';
            if (type === 'SWEETBOX') return 'Sweetbox';
            return type;
        });
        const uniqueTypes = [...new Set(seatTypes)].join(', ');

        const payment = paymentMap.get(String(b._id));
        const payMethod = payment
            ? (methodMapping[payment.paymentMethod] || payment.paymentMethod)
            : 'Chưa thanh toán';

        const statusViet = statusMapping[b.status] || b.status;

        const row = ws6.addRow([shortId, customerName, showDateFormatted, uniqueTypes, b.totalPrice, payMethod, statusViet]);
        applyDataRow(row, i % 2 === 1, [null, null, null, null, VND_FMT, null, null], ['center', 'left', 'center', 'left', 'right', 'center', 'center']);

        // Color status column nicely
        const statusCell = row.getCell(7);
        if (b.status === 'CONFIRMED') {
            statusCell.font = { color: { argb: GREEN }, bold: true };
        } else if (b.status === 'CANCELLED') {
            statusCell.font = { color: { argb: RED }, bold: true };
        }
    });

    return wb;
};

module.exports = {
    getOverviewStats,
    getRevenueByGenre,
    getRevenueByMonth,
    getRevenueByYear,
    getRevenueByTheater,
    exportDashboard,
};
