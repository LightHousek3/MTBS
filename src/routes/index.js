const express = require('express');
const authRoute = require('./auth.route');
const genreRoute = require('./genre.route');
const theaterRoute = require('./theater.route');
const promotionRoute = require('./promotion.routes');


const router = express.Router();

const routes = [
    { path: '/auth', route: authRoute },
    { path: '/genres', route: genreRoute },
    { path: '/theaters', route: theaterRoute },
    { path: '/promotions', route: promotionRoute },

];

routes.forEach((route) => {
    router.use(route.path, route.route);
});

module.exports = router;
