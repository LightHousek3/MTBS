const express = require('express');
const { recommendationController } = require('../controllers');
const { authenticate, validate } = require('../middlewares');
const { recommendationValidator } = require('../validators');

const router = express.Router();

/**
 * @route   GET /api/v1/recommendations/movies
 * @access  Private
 */
router.get(
    '/movies',
    authenticate,
    validate(recommendationValidator.getMyMovieRecommendations),
    recommendationController.getMyMovieRecommendations,
);

module.exports = router;
