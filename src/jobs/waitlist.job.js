const cron = require('node-cron');
const logger = require('../config/logger');
const { waitlistService } = require('../services');

let notificationTask;
let isRunning = false;

const startWaitlistJob = () => {
    if (notificationTask) {
        return notificationTask;
    }

    notificationTask = cron.schedule(
        '*/15 * * * *',
        async () => {
            if (isRunning) {
                return;
            }

            isRunning = true;
            try {
                const notifiedCount = await waitlistService.processReleaseNotifications();
                if (notifiedCount > 0) {
                    logger.info(`COMING_SOON_WATCHLIST_JOB: sent ${notifiedCount} notification emails`);
                }
            } catch (error) {
                logger.error('COMING_SOON_WATCHLIST_JOB_ERROR', error);
            } finally {
                isRunning = false;
            }
        },
        {
            timezone: 'Asia/Ho_Chi_Minh',
        },
    );

    logger.info('COMING_SOON_WATCHLIST_JOB_STARTED');
    return notificationTask;
};

module.exports = {
    startWaitlistJob,
};
