const express = require('express');
const { recommendationController } = require('../controllers');
const { optionalAuth, validate } = require('../middlewares');
const { recommendationValidator } = require('../validators');

const router = express.Router();

/**
 * @route   GET /api/v1/recommendations/movies
 * @access  Public, personalized when a valid bearer token is provided
 */
router.get(
    '/movies',
    optionalAuth,
    validate(recommendationValidator.getMyMovieRecommendations),
    recommendationController.getMyMovieRecommendations,
);

module.exports = router;
