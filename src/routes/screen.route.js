const express = require('express');
const { screenController } = require('../controllers');
const { authenticate, authorize, validate } = require('../middlewares');
const { USER_ROLE } = require('../constants');
const { screenValidator } = require('../validators');

const router = express.Router();

/**
 * @route   GET /api/v1/screens
 * @access  Public
 */
router.get('/', validate(screenValidator.getScreenList), screenController.getScreenList);

/**
 * @route   GET /api/v1/screens/:id
 * @access  Public
 */
router.get('/:id', validate(screenValidator.getScreen), screenController.getScreen);

// ═══════════════════════════════════════════════
// Admin-only routes
// ═══════════════════════════════════════════════

router.post(
    '/',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    validate(screenValidator.createScreen),
    screenController.createScreen
);

router.put(
    '/:id',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    validate(screenValidator.updateScreen),
    screenController.updateScreen
);

router.delete(
    '/:id',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    validate(screenValidator.deleteScreen),
    screenController.deleteScreen
);

module.exports = router;
