const express = require('express');
const authRoute = require('./auth.route');
const genreRoute = require('./genre.route');
const theaterRoute = require('./theater.route');
const promotionRoute = require('./promotion.routes');
const movieRoute = require('./movie.route');
const showtimeRoute = require('./showtime.route');
const screenRoute = require('./screen.route');
const redeemRoute = require('./redeem.route');
const redeemGiftRoute = require('./redeemGift.route');
const recommendationRoute = require('./recommendation.route');

const router = express.Router();

const routes = [
  { path: '/auth', route: authRoute },
  { path: '/genres', route: genreRoute },
  { path: '/theaters', route: theaterRoute },
  { path: '/promotions', route: promotionRoute },
  { path: '/movies', route: movieRoute },
  { path: '/showtimes', route: showtimeRoute },
  { path: '/screens', route: screenRoute },
  { path: '/redeems', route: redeemRoute },
  { path: '/redeem-gifts', route: redeemGiftRoute },
  { path: '/recommendations', route: recommendationRoute },
];

routes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
