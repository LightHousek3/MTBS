const express = require('express');
const { festivalController } = require('../controllers');
const { authenticate, authorize, validate } = require('../middlewares');
const { USER_ROLE } = require('../constants');
const { festivalValidator } = require('../validators');

const router = express.Router();

/**
 * @route   GET /api/v1/festivals
 * @access  Public
 */
router.get('/', validate(festivalValidator.getFestivalList), festivalController.getFestivalList);

/**
 * @route   GET /api/v1/festivals/:id
 * @access  Public
 */
router.get('/:id', validate(festivalValidator.getFestival), festivalController.getFestival);

// ═══════════════════════════════════════════════
// Admin-only routes
// ═══════════════════════════════════════════════

router.post(
    '/',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    validate(festivalValidator.createFestival),
    festivalController.createFestival
);

router.put(
    '/:id',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    validate(festivalValidator.updateFestival),
    festivalController.updateFestival
);

router.delete(
    '/:id',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    validate(festivalValidator.deleteFestival),
    festivalController.deleteFestival
);

module.exports = router;
