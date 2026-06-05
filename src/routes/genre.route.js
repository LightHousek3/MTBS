const express = require('express');
const { genreController } = require('../../src/controllers');
const { authenticate, authorize } = require('../../src/middlewares');
const { USER_ROLE } = require('../../src/constants');

const router = express.Router();

/**
 * @route   GET /api/v1/genres
 * @access  Public
 */
router.get('/', genreController.getGenres);

/**
 * @route   GET /api/v1/genres/:id
 * @access  Public
 */
router.get('/:id', genreController.getGenre);

// ═══════════════════════════════════════════════
// Admin-only routes
// ═══════════════════════════════════════════════

router.post(
    '/',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    genreController.createGenre
);

router.put(
    '/:id',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    genreController.updateGenre
);

router.delete(
    '/:id',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    genreController.deleteGenre
);

module.exports = router;
