const { Booking, Movie } = require('../models');
const { BOOKING_STATUS } = require('../constants');

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const MAX_HISTORY = 50;

/**
 * Chuẩn hoá số lượng kết quả trả về.
 * - Nếu client không truyền hoặc truyền sai, dùng DEFAULT_LIMIT.
 * - Luôn giới hạn trong khoảng 1..MAX_LIMIT để tránh query quá nhiều movie.
 */
const normalizeLimit = (limit) =>
    Math.min(Math.max(parseInt(limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);

/**
 * Lấy id dạng string từ ObjectId hoặc document đã populate.
 * Dùng để so sánh id ổn định giữa dữ liệu lean, ObjectId và sub-document.
 */
const getId = (value) => {
    if (!value) return null;
    if (value._id) return value._id.toString();
    if (value.id) return value.id.toString();
    return value.toString();
};

/**
 * Tăng điểm cho một key trong Map.
 * Các preference như genre, actor, origin... đều được gom điểm bằng helper này.
 */
const increment = (map, key, weight = 1) => {
    if (!key) return;
    const normalizedKey = key.toString();
    map.set(normalizedKey, (map.get(normalizedKey) || 0) + weight);
};

const toIdList = (values) => Array.from(values).map(getId).filter(Boolean);

/**
 * Xác định các nhãn độ tuổi không phù hợp với tuổi user.
 * Nếu không có tuổi hợp lệ, không áp dụng giới hạn độ tuổi ở tầng recommendation.
 */
const getAgeRestrictedRatings = (age) => {
    if (!Number.isFinite(age)) return [];
    if (age < 13) return ['T13', 'T16', 'T18', 'C'];
    if (age < 16) return ['T16', 'T18', 'C'];
    if (age < 18) return ['T18', 'C'];
    return [];
};

/**
 * Tạo filter movie đang còn khả dụng để đề xuất.
 * - Movie còn chiếu nếu endDate >= hiện tại.
 * - Movie sắp chiếu nếu releaseDate >= hiện tại.
 * - Nếu user có tuổi hợp lệ, loại các ageRating vượt quá tuổi.
 */
const getActiveMovieFilter = (user) => {
    const now = new Date();
    const restrictedRatings = getAgeRestrictedRatings(Number(user?.age));
    return {
        $or: [{ endDate: { $gte: now } }, { releaseDate: { $gte: now } }],
        ...(restrictedRatings.length ? { ageRating: { $nin: restrictedRatings } } : {}),
    };
};

/**
 * Xây profile sở thích từ lịch sử booking đã xác nhận.
 * Booking mới hơn có trọng số cao hơn; booking có tổng tiền lớn hơn được cộng nhẹ.
 * Profile lưu các tín hiệu: genre, actor, quốc gia, định dạng, ageRating và movie đã xem.
 */
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

/**
 * Lấy điểm của một key trong Map, trả về 0 nếu key không tồn tại.
 */
const getMapValue = (map, key) => (key ? map.get(key.toString()) || 0 : 0);

/**
 * Normalize lean Movie output to the same shape as normal Movie APIs.
 * lean() skips the toJSON plugin, so mobile clients need id instead of _id.
 */
const normalizeLeanMovie = (movie) => {
    const normalized = {
        ...movie,
        id: getId(movie),
    };

    delete normalized._id;
    delete normalized.__v;
    delete normalized.isDeleted;
    delete normalized.deletedAt;

    normalized.genres = (movie.genres || []).map((genre) => {
        if (!genre || typeof genre !== 'object') {
            return genre;
        }

        const normalizedGenre = {
            ...genre,
            id: getId(genre),
        };
        delete normalizedGenre._id;
        delete normalizedGenre.__v;
        return normalizedGenre;
    });

    return normalized;
};

/**
 * Tính điểm chất lượng chung của movie.
 * - ratingAverage tối đa 5 sao, quy đổi tối đa 30 điểm.
 * - totalBookings dùng log10 để phim rất nhiều booking không áp đảo toàn bộ điểm.
 */
const calculateQualityScore = (movie) => {
    const ratingScore = Math.min(Math.max(Number(movie.ratingAverage || 0), 0), 5) * 6;
    const bookingScore = Math.min(Math.log10(Number(movie.totalBookings || 0) + 1) * 8, 18);
    return ratingScore + bookingScore;
};

/**
 * Tính điểm độ mới.
 * - Movie sắp phát hành được cộng điểm cao nhất.
 * - Movie mới phát hành trong 30/90 ngày vẫn được ưu tiên nhẹ.
 */
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

/**
 * Chấm điểm một movie candidate theo profile của user.
 * Điểm cá nhân hoá ưu tiên genre, sau đó actor, origin, format, ageRating,
 * rồi cộng thêm chất lượng chung và độ mới để tránh đề xuất phim quá yếu.
 */
const scorePersonalizedMovie = (movie, profile) => {
    const matchedGenres = (movie.genres || []).filter((genre) => profile.genres.has(getId(genre)));
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

/**
 * Chuẩn hoá response cho từng movie đề xuất.
 * Gắn thêm metadata recommendation để client biết điểm, lý do và các tín hiệu match.
 */
const toRecommendationResult = (movie, recommendation) => ({
    ...normalizeLeanMovie(movie),
    recommendation: {
        score: Number(recommendation.score.toFixed(2)),
        reasons: recommendation.reasons,
        matchedGenreIds: recommendation.matchedGenreIds || [],
        matchedActors: recommendation.matchedActors || [],
    },
});

/**
 * Luồng fallback khi user chưa đăng nhập hoặc chưa có booking hợp lệ.
 * Trả về các movie đang khả dụng, ưu tiên rating, tổng booking và ngày phát hành.
 */
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

/**
 * Lấy danh sách movie đề xuất cho user.
 * - Không có user hoặc chưa có lịch sử booking CONFIRMED: dùng cold-start.
 * - Có lịch sử: dựng profile, loại phim đã xem, chấm điểm các candidate còn khả dụng.
 * - Nếu kết quả cá nhân hoá chưa đủ limit, bù bằng phim phổ biến/chất lượng cao.
 */
const getPersonalizedMovieRecommendations = async (user, options = {}) => {
    const limit = normalizeLimit(options.limit);

    if (!user) {
        return getColdStartRecommendations({ user: null, limit });
    }

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
    const watchedMovieIds = toIdList(profile.watchedMovieIds);
    const candidates = await Movie.find({
        ...getActiveMovieFilter(user),
        _id: { $nin: watchedMovieIds },
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
        const existingIds = toIdList(scoredMovies);
        const fallbackMovies = await Movie.find({
            ...getActiveMovieFilter(user),
            _id: {
                $nin: [...watchedMovieIds, ...existingIds],
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
