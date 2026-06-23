const express = require('express');
const { waitlistController } = require('../controllers');
const { authenticate, authorize, optionalAuth, validate } = require('../middlewares');
const { waitlistValidator } = require('../validators');
const { USER_ROLE } = require('../constants');

const router = express.Router();

router.get(
    '/coming-soon/:movieId/status',
    optionalAuth,
    validate(waitlistValidator.getWatchlistStatus),
    waitlistController.getWatchlistStatus,
);

router.use(authenticate, authorize(USER_ROLE.USER, USER_ROLE.ADMIN));

router.get(
    '/coming-soon',
    validate(waitlistValidator.getWatchlist),
    waitlistController.getWatchlist,
);

router.post(
    '/coming-soon',
    validate(waitlistValidator.addMovie),
    waitlistController.addMovie,
);

router.delete(
    '/coming-soon/:movieId',
    validate(waitlistValidator.removeMovie),
    waitlistController.removeMovie,
);

module.exports = router;
