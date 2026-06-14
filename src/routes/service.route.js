const express = require('express');
const { serviceController } = require('../controllers');
const { authenticate, authorize, validate } = require('../middlewares');
const { serviceValidator } = require('../validators');
const { USER_ROLE } = require('../constants');

const router = express.Router();

// ═══════════════════════════════════════════════
// Public routes
// ═══════════════════════════════════════════════

/**
 * @route   GET /api/v1/services
 * @desc    List services (filterable by theater, type, status)
 * @access  Public
 */
router.get('/', validate(serviceValidator.getServices), serviceController.getServices);

// ═══════════════════════════════════════════════
// Admin-only routes
// ═══════════════════════════════════════════════

/**
 * @route   GET /api/v1/services/:id
 * @desc    Get single service
 * @access  Admin
 */
router.get('/:id', validate(serviceValidator.getService), serviceController.getService);

/**
 * @route   POST /api/v1/services
 * @desc    Create a service (name + theater must be unique)
 * @access  Admin
 */
router.post(
    '/',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    validate(serviceValidator.createService),
    serviceController.createService,
);

/**
 * @route   PUT /api/v1/services/:id
 * @desc    Update a service
 * @access  Admin
 */
router.put(
    '/:id',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    validate(serviceValidator.updateService),
    serviceController.updateService,
);

/**
 * @route   PATCH /api/v1/services/:id/status
 * @desc    Update service status (AVAILABLE / INACTIVE)
 * @access  Admin
 */
router.patch(
    '/:id/status',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    validate(serviceValidator.updateServiceStatus),
    serviceController.updateServiceStatus,
);

/**
 * @route   DELETE /api/v1/services/:id
 * @desc    Soft delete a service
 * @access  Admin
 */
router.delete(
    '/:id',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    validate(serviceValidator.deleteService),
    serviceController.deleteService,
);

module.exports = router;
