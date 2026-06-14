const express = require('express');
const router = express.Router();
const screenController = require('../controllers/screen.controller');
const { USER_ROLE } = require('../../src/constants');
const { validate, authenticate, authorize } = require('../../src/middlewares');
const screenValidator = require('../validators/screen.validator');

/**
 * @route   POST /api/v1/screens
 * @access  Admin
 */
router.post(
    '/',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    validate(screenValidator.createScreen),
    screenController.createScreen,
);

/**
 * @route   GET /api/v1/screens
 * @access  Public
 */
router.get('/', screenController.getScreenList);

/**
 * @route   GET /api/v1/screens/:id
 * @access  Admin
 */
router.get(
    '/:id',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    validate(screenValidator.screenId),
    screenController.getScreenDetail,
);

/**
 * @route   PUT /api/v1/screens/:id
 * @access  Admin
 */
router.put(
    '/:id',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    validate(screenValidator.updateScreen),
    screenController.updateScreen,
);

/**
 * @route   DELETE /api/v1/screens/:id
 * @access  Admin
 */
router.delete(
    '/:id',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    validate(screenValidator.screenId),
    screenController.deleteScreen,
);

module.exports = router;
