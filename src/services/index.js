const authService = require('./auth.service');
const bannerService = require('./banner.services');
const genreService = require('./genre.service');
const theaterService = require('./theater.service');
const serviceService = require('./service.service');
const promotionService = require('./promotion.service');
const movieService = require('./movie.service');
const showtimeService = require('./showtime.service');
const redeemService = require('./redeem.service');
const recommendationService = require('./recommendation.service');
const ticketPriceService = require('./ticketPrice.service');
const seatService = require('./seat.service');

module.exports = {
    authService,
    bannerService,
    genreService,
    theaterService,
    serviceService,
    promotionService,
    movieService,
    showtimeService,
    redeemService,
    recommendationService,
    ticketPriceService,
    seatService,
};
