const { recommendationService } = require('../services');
const { asyncHandler, ResponseHandler, pick } = require('../utils');

const getMyMovieRecommendations = asyncHandler(async (req, res) => {
    const options = pick(req.query, ['limit']);
    const result = await recommendationService.getPersonalizedMovieRecommendations(
        req.user,
        options,
    );

    ResponseHandler.success(res, {
        message: 'Lấy danh sách phim đề xuất thành công',
        data: result.results,
        meta: {
            strategy: result.strategy,
            historyCount: result.historyCount,
            limit: Number(options.limit) || 10,
        },
    });
});

module.exports = {
    getMyMovieRecommendations,
};
