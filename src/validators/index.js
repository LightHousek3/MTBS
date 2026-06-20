const authValidator = require('./auth.validator');
const theaterValidator = require('./theater.validator');
const serviceValidator = require('./service.validator');
const promotionValidator = require('./promotion.validator');
const movieValidator = require('./movie.validator');
const showtimeValidator = require('./showtime.validator');
const screenValidator = require('./screen.validator');
const redeemValidator = require('./redeem.validator');
const recommendationValidator = require('./recommendation.validator');
const ticketPriceValidator = require('./ticketPrice.validator');
const seatValidator = require('./seat.validator');
const bannerValidator = require('./banner.validator');
const bookingValidator = require('./booking.validator');

module.exports = {
    authValidator,
    theaterValidator,
    serviceValidator,
    promotionValidator,
    movieValidator,
    showtimeValidator,
    screenValidator,
    redeemValidator,
    recommendationValidator,
    ticketPriceValidator,
    seatValidator,
    bannerValidator,
    bookingValidator,
};
