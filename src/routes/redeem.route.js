const express = require('express');
const { redeemController } = require('../controllers');
const { authenticate, authorize, optionalAuth, validate } = require('../middlewares');
const { USER_ROLE } = require('../constants');
const { redeemValidator } = require('../validators');

const router = express.Router();

router.get('/', optionalAuth, validate(redeemValidator.getRedeems), redeemController.getRedeems);
router.get('/:id', optionalAuth, validate(redeemValidator.getRedeem), redeemController.getRedeem);

router.post(
    '/:id/redeem',
    authenticate,
    validate(redeemValidator.redeemGift),
    redeemController.redeemGift,
);

router.post(
    '/',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    validate(redeemValidator.createRedeem),
    redeemController.createRedeem,
);

router.put(
    '/:id',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    validate(redeemValidator.updateRedeem),
    redeemController.updateRedeem,
);

router.delete(
    '/:id',
    authenticate,
    authorize(USER_ROLE.ADMIN),
    validate(redeemValidator.deleteRedeem),
    redeemController.deleteRedeem,
);

module.exports = router;
