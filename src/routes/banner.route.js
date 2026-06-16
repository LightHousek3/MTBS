const express = require('express');
const { bannerController } = require('../controllers');
const { authenticate, authorize, validate } = require('../middlewares');
const { USER_ROLE } = require('../constants');
const { bannerValidator } = require('../validators');

const router = express.Router();

/**
 * @route   GET /api/v1/banners
 * @access  Public
 */
router.get('/', validate(bannerValidator.getBanners), bannerController.getBanners);

/**
 * @route   GET /api/v1/banners/:id
 * @access  Public
 */
router.get('/:id', validate(bannerValidator.getBanner), bannerController.getBanner);

// ═══════════════════════════════════════════════
// Admin-only routes
// ═══════════════════════════════════════════════

router.post(
    '/',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    validate(bannerValidator.createBanner),
    bannerController.createBanner
);

router.put(
    '/:id',
    authenticate,
    validate(bannerValidator.updateBanner),
    authorize(USER_ROLE.ADMIN),
    bannerController.updateBanner
);

router.delete(
    '/:id',
    authenticate,
    validate(bannerValidator.deleteBanner),
    authorize(USER_ROLE.ADMIN),
    bannerController.deleteBanner
);

module.exports = router;
