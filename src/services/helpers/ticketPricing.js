const { TicketPrice } = require('../../models');
const logger = require('../../config/logger');
const { getVietnamDateParts, toVietnamDateKey, toVietnamHHMM } = require('../../utils');

const holidayCache = new Map();

const getHolidayDates = async (year) => {
    if (holidayCache.has(year)) return holidayCache.get(year);

    let dates = [];
    try {
        const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/VN`, {
            signal: AbortSignal.timeout(2000),
        });
        if (response.ok) {
            const holidays = await response.json();
            dates = holidays.map((holiday) => holiday.date);
        }
    } catch (error) {
        logger.error('Failed to fetch Vietnamese public holidays', error);
    }

    const result = new Set(dates);
    holidayCache.set(year, result);
    return result;
};

const getTicketDayType = async (startTime) => {
    const { year, weekday } = getVietnamDateParts(startTime);
    if (weekday === 0 || weekday === 6) return 'WEEKEND';

    const holidays = await getHolidayDates(year);
    return holidays.has(toVietnamDateKey(startTime)) ? 'WEEKEND' : 'WEEKDAY';
};

const findTicketPrices = async ({ seatTypes, typeMovie, startTime }) => {
    const dayType = await getTicketDayType(startTime);
    const showtimeStartHHMM = toVietnamHHMM(startTime);
    const prices = await TicketPrice.find({
        typeSeat: { $in: seatTypes },
        typeMovie,
        dayType,
        startTime: { $lte: showtimeStartHHMM },
        endTime: { $gte: showtimeStartHHMM },
    })
        .select('typeSeat price')
        .lean();

    return {
        dayType,
        showtimeStartHHMM,
        priceBySeatType: new Map(prices.map((price) => [price.typeSeat, price.price])),
    };
};

module.exports = {
    findTicketPrices,
    getTicketDayType,
};
