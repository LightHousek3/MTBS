const express = require('express');
const { theaterController } = require('../../src/controllers');
const { validate, authenticate, authorize } = require('../../src/middlewares');
const { theaterValidator } = require('../../src/validators');
const { USER_ROLE } = require('../../src/constants');

const router = express.Router();

/**
 * @route   GET /api/v1/theaters
 * @desc    Get all theaters
 * @access  Public
 */
router.get('/', validate(theaterValidator.getTheaters), theaterController.getTheaters);

/**
 * @route   GET /api/v1/theaters/locations
 * @desc    Get all distinct theater locations
 * @access  Public
 */
router.get('/locations', theaterController.getLocations);

/**
 * @route   GET /api/v1/theaters/:id
 * @desc    Get theater by ID
 * @access  Public
 */
router.get('/:id', validate(theaterValidator.getTheater), theaterController.getTheater);

// ═══════════════════════════════════════════════
// Admin-only routes
// ═══════════════════════════════════════════════

router.post(
    '/',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    validate(theaterValidator.createTheater),
    theaterController.createTheater,
);

router.put(
    '/:id',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    validate(theaterValidator.updateTheater),
    theaterController.updateTheater,
);

router.delete(
    '/:id',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    validate(theaterValidator.deleteTheater),
    theaterController.deleteTheater,
);

module.exports = router;
