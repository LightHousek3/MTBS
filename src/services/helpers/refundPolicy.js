const { ApiError } = require('../../utils');
const { messages } = require('../../constants');

const getRefundPointsRequirement = (booking) => Math.max(0, Number(booking?.pointsEarned) || 0);

const assertRefundPointsBalance = ({ requiredPoints, currentPoints }) => {
    if (requiredPoints <= 0) return;

    const normalizedCurrentPoints = Math.max(0, Number(currentPoints) || 0);
    if (normalizedCurrentPoints < requiredPoints) {
        throw ApiError.badRequest(
            messages.REFUND.NOT_ENOUGH_LOYALTY_POINTS(requiredPoints, normalizedCurrentPoints),
        );
    }
};

module.exports = {
    getRefundPointsRequirement,
    assertRefundPointsBalance,
};
