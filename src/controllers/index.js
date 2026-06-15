const authController = require('./auth.controller');
const genreController = require('./genre.controller');
const theaterController = require('./theater.controller');
const serviceController = require('./service.controller');
const promotionController = require('./promotion.controller');
const movieController = require('./movie.controller');
const showtimeController = require('./showtime.controller');
const screenController = require('./screen.controller');
const redeemController = require('./redeem.controller');
const redeemGiftController = require('./redeemGift.controller');
const recommendationController = require('./recommendation.controller');
const ticketPriceController = require('./ticketPrice.controller');
const seatController = require('./seat.controller');

module.exports = {
    authController,
    genreController,
    theaterController,
    serviceController,
    promotionController,
    movieController,
    showtimeController,
    screenController,
    redeemController,
    redeemGiftController,
    recommendationController,
    ticketPriceController,
    seatController,
};
