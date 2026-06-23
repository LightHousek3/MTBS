const express = require('express');
const { newsController } = require('../controllers');
const { authenticate, authorize, validate } = require('../middlewares');
const { USER_ROLE } = require('../constants');
const { newsValidator } = require('../validators');

const router = express.Router();

/**
 * @route   GET /api/v1/news
 * @access  Public
 */
router.get('/', validate(newsValidator.getNewsList), newsController.getNewsList);

/**
 * @route   GET /api/v1/news/:id
 * @access  Public
 */
router.get('/:id', validate(newsValidator.getNews), newsController.getNews);

// ═══════════════════════════════════════════════
// Admin-only routes
// ═══════════════════════════════════════════════

router.post(
    '/',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    validate(newsValidator.createNews),
    newsController.createNews
);

router.put(
    '/:id',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    validate(newsValidator.updateNews),
    newsController.updateNews
);

router.delete(
    '/:id',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    validate(newsValidator.deleteNews),
    newsController.deleteNews
);

module.exports = router;
