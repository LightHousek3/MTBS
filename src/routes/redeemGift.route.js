const express = require('express');
const { redeemGiftController } = require('../controllers');
const { authenticate, authorize, validate } = require('../middlewares');
const { USER_ROLE } = require('../constants');
const { redeemValidator } = require('../validators');

const router = express.Router();

router.get(
    '/me/history',
    authenticate,
    validate(redeemValidator.getMyRedeemGiftHistory),
    redeemGiftController.getMyRedeemGiftHistory,
);

router.patch(
    '/:id/cancel',
    authenticate,
    validate(redeemValidator.cancelRedeemGift),
    redeemGiftController.cancelMyRedeemGift,
);

router.use(authenticate, authorize(USER_ROLE.ADMIN));

router.get('/', validate(redeemValidator.getRedeemGifts), redeemGiftController.getRedeemGifts);
router.get('/:id', validate(redeemValidator.getRedeemGift), redeemGiftController.getRedeemGift);
router.post('/', validate(redeemValidator.createRedeemGift), redeemGiftController.createRedeemGift);
router.put('/:id', validate(redeemValidator.updateRedeemGift), redeemGiftController.updateRedeemGift);
router.delete(
    '/:id',
    validate(redeemValidator.deleteRedeemGift),
    redeemGiftController.deleteRedeemGift,
);

module.exports = router;
