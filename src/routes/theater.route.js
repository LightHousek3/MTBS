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

/**
 * @route   POST /api/v1/theaters
 * @desc    Create a new theater
 * @access  Admin
 */
router.post(
    '/',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    validate(theaterValidator.createTheater),
    theaterController.createTheater,
);

/**
 * @route   PUT /api/v1/theaters/:id
 * @desc    Update a existing theater
 * @access  Admin
 */
router.put(
    '/:id',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    validate(theaterValidator.updateTheater),
    theaterController.updateTheater,
);

/**
 * @route   DELETE /api/v1/theaters/:id
 * @desc    Soft delete a existing theater
 * @access  Admin
 */
router.delete(
    '/:id',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    validate(theaterValidator.deleteTheater),
    theaterController.deleteTheater,
);

/**
 * @route   PATCH /api/v1/theaters/:id/coordinates
 * @desc    Geocode an address with OpenStreetMap and update theater coordinates
 * @access  Admin
 */
router.patch(
    '/:id/coordinates',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    validate(theaterValidator.updateCoordinates),
    theaterController.updateCoordinatesByAddress,
);

module.exports = router;
