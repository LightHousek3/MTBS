const { Waitlist, Movie } = require('../models');
const { ApiError } = require('../utils');
const { messages } = require('../constants');
const { sendComingSoonNowShowingEmail } = require('./email.service');
const logger = require('../config/logger');

const watchlistMoviePopulate = {
    path: 'movie',
    select: 'title image releaseDate endDate ageRating duration origin type genres description',
    populate: {
        path: 'genres',
        select: 'name',
    },
};

const ensureUpcomingMovie = async (movieId) => {
    const movie = await Movie.findById(movieId).populate('genres', 'name');

    if (!movie) {
        throw ApiError.notFound(messages.CRUD.NOT_FOUND('Movie'));
    }

    if (!movie.releaseDate || new Date(movie.releaseDate) <= new Date()) {
        throw ApiError.badRequest('Chỉ có thể thêm phim sắp chiếu vào danh sách chờ chiếu');
    }

    return movie;
};

const isUpcomingMovie = (movie) => Boolean(movie?.releaseDate && new Date(movie.releaseDate) > new Date());

const addMovie = async (userId, movieId) => {
    await ensureUpcomingMovie(movieId);

    const watchlistItem = await Waitlist.findOneAndUpdate(
        {
            user: userId,
            movie: movieId,
        },
        {
            $setOnInsert: {
                user: userId,
                movie: movieId,
            },
        },
        {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
        },
    );

    return Waitlist.findById(watchlistItem._id).populate(watchlistMoviePopulate);
};

const removeMovie = async (userId, movieId) => {
    await Waitlist.findOneAndDelete({
        user: userId,
        movie: movieId,
    });
};

const getWatchlist = async (userId, options = {}) => {
    const includeReleased = options.includeReleased === true || options.includeReleased === 'true';
    const page = Math.max(parseInt(options.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(options.limit, 10) || 20, 1), 100);

    const watchlistItems = await Waitlist.find({ user: userId })
        .sort({ createdAt: -1 })
        .populate(watchlistMoviePopulate);

    const filteredItems = watchlistItems.filter((item) => {
        if (!item.movie) return false;
        if (includeReleased) return true;
        return item.movie.releaseDate && new Date(item.movie.releaseDate) > new Date();
    });

    const totalResults = filteredItems.length;
    const totalPages = Math.ceil(totalResults / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedItems = filteredItems.slice(startIndex, startIndex + limit);

    return {
        results: paginatedItems.map((item) => ({
            id: item.id,
            movie: item.movie,
            createdAt: item.createdAt,
            notifiedAt: item.notifiedAt,
        })),
        meta: {
            page,
            limit,
            totalResults,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        },
    };
};

const getWatchlistStatus = async (userId, movieId) => {
    const movie = await Movie.findById(movieId).select('releaseDate');
    const canAddToWaitlist = isUpcomingMovie(movie);
    const watchlistItem = userId
        ? await Waitlist.findOne({
              user: userId,
              movie: movieId,
          }).select('_id')
        : null;

    return {
        movieId,
        isSaved: canAddToWaitlist && Boolean(watchlistItem),
        canAddToWaitlist,
    };
};

const processReleaseNotifications = async () => {
    const now = new Date();

    const pendingItems = await Waitlist.find({
        notifiedAt: null,
    })
        .populate({
            path: 'user',
            select: 'firstName lastName email',
        })
        .populate({
            path: 'movie',
            select: 'title image releaseDate',
        });

    let notifiedCount = 0;

    for (const item of pendingItems) {
        const user = item.user;
        const movie = item.movie;

        if (!user?.email || !movie?.releaseDate) {
            continue;
        }

        if (new Date(movie.releaseDate) > now) {
            continue;
        }

        try {
            await sendComingSoonNowShowingEmail({
                to: user.email,
                firstName: user.firstName,
                movieTitle: movie.title,
                releaseDate: movie.releaseDate,
                posterUrl: movie.image?.url || null,
            });

            item.notifiedAt = new Date();
            await item.save();
            notifiedCount += 1;
        } catch (error) {
            logger.error('COMING_SOON_WATCHLIST_NOTIFY_ERROR', {
                watchlistId: item.id,
                userId: user.id,
                movieId: movie.id,
                error: error.message,
            });
        }
    }

    return notifiedCount;
};

module.exports = {
    addMovie,
    removeMovie,
    getWatchlist,
    getWatchlistStatus,
    processReleaseNotifications,
};
