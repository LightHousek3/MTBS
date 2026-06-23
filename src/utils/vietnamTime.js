const VIETNAM_TIMEZONE_OFFSET_HOURS = 7;
const VIETNAM_TIMEZONE_OFFSET_MS = VIETNAM_TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000;

const getVietnamDateParts = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    const vietnamDate = new Date(date.getTime() + VIETNAM_TIMEZONE_OFFSET_MS);

    return {
        year: vietnamDate.getUTCFullYear(),
        month: vietnamDate.getUTCMonth() + 1,
        day: vietnamDate.getUTCDate(),
        weekday: vietnamDate.getUTCDay(),
        hour: vietnamDate.getUTCHours(),
        minute: vietnamDate.getUTCMinutes(),
    };
};

const toVietnamHHMM = (value) => {
    const { hour, minute } = getVietnamDateParts(value);
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const toVietnamDateKey = (value) => {
    const { year, month, day } = getVietnamDateParts(value);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

module.exports = {
    VIETNAM_TIMEZONE_OFFSET_HOURS,
    getVietnamDateParts,
    toVietnamDateKey,
    toVietnamHHMM,
};
