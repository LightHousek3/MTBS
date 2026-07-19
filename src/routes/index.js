const express = require('express');
const authRoute = require('./auth.route');
const bannerRoute = require('./banner.route');
const newsRoute = require('./news.route');
const festivalRoute = require('./festival.route');
const genreRoute = require('./genre.route');
const theaterRoute = require('./theater.route');
const serviceRoute = require('./service.route');
const promotionRoute = require('./promotion.routes');
const movieRoute = require('./movie.route');
const showtimeRoute = require('./showtime.route');
const screenRoute = require('./screen.route');
const seatRoute = require('./seat.route');
const redeemRoute = require('./redeem.route');
const redeemGiftRoute = require('./redeemGift.route');
const recommendationRoute = require('./recommendation.route');
const ticketPriceRoute = require('./ticketPrice.route');
const bookingRoute = require('./booking.route');
const paymentRoute = require('./payment.route');
const userRoute = require('./user.route');

const waitlistRoute = require('./waitlist.route');
const reviewRoute = require('./review.route');
const router = express.Router();

const routes = [
    { path: '/auth', route: authRoute },
    { path: '/banners', route: bannerRoute },
    { path: '/news', route: newsRoute },
    { path: '/festivals', route: festivalRoute },
    { path: '/genres', route: genreRoute },
    { path: '/theaters', route: theaterRoute },
    { path: '/services', route: serviceRoute },
    { path: '/promotions', route: promotionRoute },
    { path: '/movies', route: movieRoute },
    { path: '/showtimes', route: showtimeRoute },
    { path: '/screens', route: screenRoute },
    { path: '/seats', route: seatRoute },
    { path: '/redeems', route: redeemRoute },
    { path: '/redeem-gifts', route: redeemGiftRoute },
    { path: '/recommendations', route: recommendationRoute },
    { path: '/ticket-prices', route: ticketPriceRoute },
    { path: '/bookings', route: bookingRoute },
    { path: '/payments', route: paymentRoute },
    { path: '/users', route: userRoute },
    { path: '/waitlist', route: waitlistRoute },
    { path: '/reviews', route: reviewRoute },
];

routes.forEach((route) => {
    router.use(route.path, route.route);
});

module.exports = router;
