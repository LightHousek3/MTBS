const { Booking, Movie } = require('../models');
const { BOOKING_STATUS } = require('../constants');

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const MAX_HISTORY = 50;

const normalizeLimit = (limit) =>
    Math.min(Math.max(parseInt(limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);

const getId = (value) => {
    if (!value) return null;
    if (value._id) return value._id.toString();
    return value.toString();
};

const increment = (map, key, weight = 1) => {
    if (!key) return;
    const normalizedKey = key.toString();
    map.set(normalizedKey, (map.get(normalizedKey) || 0) + weight);
};

const getAgeRestrictedRatings = (age) => {
    if (!Number.isFinite(age)) return [];
    if (age < 13) return ['T13', 'T16', 'T18', 'C'];
    if (age < 16) return ['T16', 'T18', 'C'];
    if (age < 18) return ['T18', 'C'];
    return [];
};

const getActiveMovieFilter = (user) => {
    const now = new Date();
    const restrictedRatings = getAgeRestrictedRatings(Number(user?.age));
    return {
        $or: [{ endDate: { $gte: now } }, { releaseDate: { $gte: now } }],
        ...(restrictedRatings.length ? { ageRating: { $nin: restrictedRatings } } : {}),
    };
};

const buildPreferenceProfile = (bookings) => {
    const profile = {
        genres: new Map(),
        actors: new Map(),
        origins: new Map(),
        types: new Map(),
        ageRatings: new Map(),
        watchedMovieIds: new Set(),
    };

    bookings.forEach((booking, index) => {
        const movie = booking.showtime?.movie;
        if (!movie) return;

        const recencyWeight = 1 / (1 + index * 0.15);
        const spendWeight = Math.min(Number(booking.totalPrice || 0) / 200000, 1);
        const weight = recencyWeight + spendWeight * 0.25;

        profile.watchedMovieIds.add(getId(movie));
        (movie.genres || []).forEach((genre) => increment(profile.genres, getId(genre), weight));
        (movie.actors || []).forEach((actor) => increment(profile.actors, actor, weight * 0.35));
        increment(profile.origins, movie.origin, weight * 0.6);
        increment(profile.types, movie.type, weight * 0.4);
        increment(profile.ageRatings, movie.ageRating, weight * 0.2);
    });

    return profile;
};

const getMapValue = (map, key) => (key ? map.get(key.toString()) || 0 : 0);

const calculateQualityScore = (movie) => {
    const ratingScore = Math.min(Math.max(Number(movie.ratingAverage || 0), 0), 5) * 6;
    const bookingScore = Math.min(Math.log10(Number(movie.totalBookings || 0) + 1) * 8, 18);
    return ratingScore + bookingScore;
};

const calculateFreshnessScore = (movie) => {
    if (!movie.releaseDate) return 0;
    const releaseTime = new Date(movie.releaseDate).getTime();
    if (Number.isNaN(releaseTime)) return 0;

    const daysFromRelease = (Date.now() - releaseTime) / (1000 * 60 * 60 * 24);
    if (daysFromRelease < 0) return 6;
    if (daysFromRelease <= 30) return 5;
    if (daysFromRelease <= 90) return 3;
    return 0;
};

const scorePersonalizedMovie = (movie, profile) => {
    const matchedGenres = (movie.genres || []).filter((genre) =>
        profile.genres.has(getId(genre)),
    );
    const matchedActors = (movie.actors || []).filter((actor) => profile.actors.has(actor));

    const genreScore = matchedGenres.reduce(
        (sum, genre) => sum + getMapValue(profile.genres, getId(genre)) * 10,
        0,
    );
    const actorScore = matchedActors.reduce(
        (sum, actor) => sum + getMapValue(profile.actors, actor) * 3,
        0,
    );
    const originScore = getMapValue(profile.origins, movie.origin) * 4;
    const typeScore = getMapValue(profile.types, movie.type) * 2;
    const ageRatingScore = getMapValue(profile.ageRatings, movie.ageRating);
    const qualityScore = calculateQualityScore(movie);
    const freshnessScore = calculateFreshnessScore(movie);

    const score =
        genreScore +
        actorScore +
        originScore +
        typeScore +
        ageRatingScore +
        qualityScore +
        freshnessScore;

    const reasons = [];
    if (matchedGenres.length) reasons.push('MATCHED_GENRES');
    if (matchedActors.length) reasons.push('MATCHED_ACTORS');
    if (originScore > 0) reasons.push('MATCHED_ORIGIN');
    if (typeScore > 0) reasons.push('MATCHED_FORMAT');
    if (Number(movie.ratingAverage || 0) >= 4) reasons.push('HIGH_RATING');
    if (Number(movie.totalBookings || 0) > 0) reasons.push('POPULAR_BOOKING');
    if (freshnessScore > 0) reasons.push('RECENT_OR_UPCOMING');

    return {
        score,
        reasons: reasons.length ? reasons : ['POPULAR_HIGH_QUALITY'],
        matchedGenreIds: matchedGenres.map(getId),
        matchedActors,
    };
};

const toRecommendationResult = (movie, recommendation) => ({
    ...movie,
    recommendation: {
        score: Number(recommendation.score.toFixed(2)),
        reasons: recommendation.reasons,
        matchedGenreIds: recommendation.matchedGenreIds || [],
        matchedActors: recommendation.matchedActors || [],
    },
});

const getColdStartRecommendations = async ({ user, limit }) => {
    const movies = await Movie.find(getActiveMovieFilter(user))
        .populate('genres', 'name')
        .sort({ ratingAverage: -1, totalBookings: -1, releaseDate: -1 })
        .limit(limit)
        .lean({ virtuals: true });

    return {
        strategy: 'COLD_START_POPULAR_HIGH_QUALITY',
        historyCount: 0,
        results: movies.map((movie) =>
            toRecommendationResult(movie, {
                score: calculateQualityScore(movie) + calculateFreshnessScore(movie),
                reasons: ['COLD_START', 'POPULAR_HIGH_QUALITY'],
            }),
        ),
    };
};

const getPersonalizedMovieRecommendations = async (user, options = {}) => {
    const limit = normalizeLimit(options.limit);

    const bookings = await Booking.find({
        user: user._id || user.id,
        status: BOOKING_STATUS.CONFIRMED,
    })
        .sort({ createdAt: -1 })
        .limit(MAX_HISTORY)
        .populate({
            path: 'showtime',
            populate: {
                path: 'movie',
                populate: { path: 'genres', select: 'name' },
            },
        })
        .lean({ virtuals: true });

    const validBookings = bookings.filter((booking) => booking.showtime?.movie);
    if (!validBookings.length) {
        return getColdStartRecommendations({ user, limit });
    }

    const profile = buildPreferenceProfile(validBookings);
    const candidates = await Movie.find({
        ...getActiveMovieFilter(user),
        _id: { $nin: Array.from(profile.watchedMovieIds) },
    })
        .populate('genres', 'name')
        .lean({ virtuals: true });

    const scoredMovies = candidates
        .map((movie) => ({
            movie,
            recommendation: scorePersonalizedMovie(movie, profile),
        }))
        .sort((a, b) => b.recommendation.score - a.recommendation.score)
        .slice(0, limit)
        .map(({ movie, recommendation }) => toRecommendationResult(movie, recommendation));

    if (scoredMovies.length < limit) {
        const existingIds = new Set(scoredMovies.map((movie) => getId(movie)));
        const fallbackMovies = await Movie.find({
            ...getActiveMovieFilter(user),
            _id: {
                $nin: [...Array.from(profile.watchedMovieIds), ...Array.from(existingIds)],
            },
        })
            .populate('genres', 'name')
            .sort({ ratingAverage: -1, totalBookings: -1, releaseDate: -1 })
            .limit(limit - scoredMovies.length)
            .lean({ virtuals: true });

        scoredMovies.push(
            ...fallbackMovies.map((movie) =>
                toRecommendationResult(movie, {
                    score: calculateQualityScore(movie) + calculateFreshnessScore(movie),
                    reasons: ['PERSONALIZED_FALLBACK', 'POPULAR_HIGH_QUALITY'],
                }),
            ),
        );
    }

    return {
        strategy: 'PERSONALIZED_BOOKING_HISTORY',
        historyCount: validBookings.length,
        results: scoredMovies,
    };
};

module.exports = {
    getPersonalizedMovieRecommendations,
};
