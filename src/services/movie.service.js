/**
 * Service: Movie
 *
 * Chứa logic truy vấn và thao tác dữ liệu liên quan đến Movie.
 * - Làm việc trực tiếp với các model (Movie, Showtime, Genre, Booking).
 * - Ném `ApiError` cho các tình huống lỗi để middleware xử lý chung.
 * - Hầu hết hàm trả về tài nguyên hoặc object đã xử lý, không trực tiếp gửi response.
 */

const mongoose = require("mongoose");
const { Movie, Showtime, Genre, Booking } = require("../models");
const { ApiError } = require("../utils");
const { httpStatus, messages, BOOKING_STATUS } = require("../constants");

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Tạo movie mới
 * - Kiểm tra trùng title, nếu trùng ném lỗi conflict
 * - Nếu có danh sách `genres`, kiểm tra tất cả genre tồn tại
 * - Trả về document movie vừa tạo
 */
const createMovie = async (body) => {
  const existing = await Movie.findOne({
    title: {
      $regex: `^${escapeRegExp(body.title.trim())}$`,
      $options: "i",
    },
  });
  if (existing) {
    throw ApiError.conflict(messages.CRUD.ALREADY_EXISTS("Movie"));
  }

  if (body.genres && body.genres.length > 0) {
    const existingGenres = await Genre.countDocuments({
      _id: { $in: body.genres },
    });

    if (existingGenres !== body.genres.length) {
      throw ApiError.badRequest(messages.CRUD.NOT_FOUND("Genre"));
    }
  }

  return Movie.create(body);
};

/**
 * Lấy danh sách movies với hỗ trợ filter và pagination.
 *
 * Trường hợp đặc biệt: khi `filter.location` tồn tại, cần lấy movie theo địa điểm
 * -> Vì location liên quan đến `theater` (qua screen -> showtime), sử dụng aggregation
 * để join các collection: showtimes -> screens -> theaters, sau đó lọc theo `theater.location`.
 *
 * Sau khi lấy aggregation result, thực hiện phân trang thủ công (slice) vì kết quả là array.
 * Nếu không có `location`, dùng `Movie.paginate` (plugin mongoose-paginate) để xử lý.
 */
const getMovies = async (filter, options) => {
  const keyword = filter.keyword?.trim();
  const titleKeyword = filter.title?.trim();
  const originKeyword = filter.origin?.trim();

  if (keyword) {
    filter.$or = [
      {
        title: {
          $regex: keyword,
          $options: "i",
        },
      },
      {
        origin: {
          $regex: keyword,
          $options: "i",
        },
      },
    ];
    delete filter.keyword;
    delete filter.title;
    delete filter.origin;
  } else if (titleKeyword && originKeyword) {
    filter.$or = [
      {
        title: {
          $regex: titleKeyword,
          $options: "i",
        },
      },
      {
        origin: {
          $regex: originKeyword,
          $options: "i",
        },
      },
    ];
    delete filter.keyword;
    delete filter.title;
    delete filter.origin;
  } else if (titleKeyword) {
    delete filter.keyword;
    filter.title = {
      $regex: titleKeyword,
      $options: "i",
    };
  } else if (originKeyword) {
    delete filter.keyword;
    filter.origin = {
      $regex: originKeyword,
      $options: "i",
    };
  } else {
    delete filter.keyword;
  }

  // Check if location filter exists
  if (filter.location) {
    const location = filter.location.trim();
    delete filter.location; // Remove location from filter object

    // Use aggregation to join with Showtime, Screen, and Theater
    const aggregationPipeline = [
      // Match movies by other criteria
      { $match: filter },
      // Join with Showtime
      {
        $lookup: {
          from: "showtimes",
          localField: "_id",
          foreignField: "movie",
          as: "showtimes",
        },
      },
      // Join Screen through Showtime
      {
        $unwind: "$showtimes",
      },
      {
        $lookup: {
          from: "screens",
          localField: "showtimes.screen",
          foreignField: "_id",
          as: "screen",
        },
      },
      {
        $unwind: "$screen",
      },
      // Join Theater through Screen
      {
        $lookup: {
          from: "theaters",
          localField: "screen.theater",
          foreignField: "_id",
          as: "theater",
        },
      },
      {
        $unwind: "$theater",
      },
      // Match by location
      {
        $match: {
          "theater.location": {
            $regex: escapeRegExp(location),
            $options: "i",
          },
        },
      },
      // Group back to get unique movies
      {
        $group: {
          _id: "$_id",
          title: { $first: "$title" },
          genres: { $first: "$genres" },
          description: { $first: "$description" },
          author: { $first: "$author" },
          image: { $first: "$image" },
          trailer: { $first: "$trailer" },
          type: { $first: "$type" },
          duration: { $first: "$duration" },
          origin: { $first: "$origin" },
          releaseDate: { $first: "$releaseDate" },
          endDate: { $first: "$endDate" },
          ageRating: { $first: "$ageRating" },
          actors: { $first: "$actors" },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" },
        },
      },
    ];

    // Handle populate option
    if (options.populate) {
      const populateFields = options.populate.split(",").map((f) => f.trim());

      if (populateFields.includes("genres")) {
        aggregationPipeline.push({
          $lookup: {
            from: "genres",
            localField: "genres",
            foreignField: "_id",
            pipeline: [
              {
                $project: {
                  name: 1,
                  id: "$_id",
                  _id: 0,
                },
              },
            ],
            as: "genres",
          },
        });
      }
    }

    const result = await Movie.aggregate(aggregationPipeline);
    // Return paginated result
    const limit = Math.min(Math.max(parseInt(options.limit, 10) || 10, 1), 100);
    const page = Math.max(parseInt(options.page, 10) || 1, 1);
    const skip = (page - 1) * limit;
    const total = result.length;
    const totalPages = Math.ceil(total / limit);
    const results = result.slice(skip, skip + limit);

    return {
      results,
      meta: {
        page,
        limit,
        totalResults: total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  return Movie.paginate(filter, options);
};

/**
 * Lấy movie theo id
 * - Dùng `populate('genres')` để trả về thông tin genres thay vì ObjectId
 * - Nếu không tìm thấy, ném lỗi notFound
 */
const getMovieById = async (id) => {
  const movie = await Movie.findById(id).populate("genres");
  if (!movie) {
    throw ApiError.notFound(messages.CRUD.NOT_FOUND("Movie"));
  }
  return movie;
};

/**
 * Kiểm tra khi cập nhật releaseDate/endDate không làm thu hẹp khoảng thời gian
 * đã có showtime.
 * - Lấy earliestStart/latestEnd từ tất cả showtime của movie
 * - Nếu releaseDate mới > earliestStart (bắt đầu muộn hơn showtime cũ) hoặc
 *   endDate mới < latestEnd (kết thúc sớm hơn showtime cũ) -> ném lỗi
 */
const ensureMovieDateWindowNotShrunk = async ({
  movieId,
  releaseDate,
  endDate,
}) => {
  const [showtimeBoundary] = await Showtime.aggregate([
    {
      $match: {
        movie: new mongoose.Types.ObjectId(movieId),
      },
    },
    {
      $group: {
        _id: null,
        earliestStart: { $min: "$startTime" },
        latestEnd: { $max: "$endTime" },
        total: { $sum: 1 },
      },
    },
  ]);

  if (!showtimeBoundary || showtimeBoundary.total === 0) {
    return;
  }

  const normalizedReleaseDate = new Date(releaseDate);
  const normalizedEndDate = new Date(endDate);

  if (
    normalizedReleaseDate > showtimeBoundary.earliestStart ||
    normalizedEndDate < showtimeBoundary.latestEnd
  ) {
    throw ApiError.badRequest(
      messages.VALIDATION.MOVIE_DATE_RANGE_CANNOT_SHRINK,
    );
  }
};

const ensureMovieDateRangeValid = ({ releaseDate, endDate }) => {
  if (!releaseDate || !endDate) {
    return;
  }

  if (new Date(endDate) <= new Date(releaseDate)) {
    throw ApiError.badRequest("endDate must be greater than releaseDate");
  }
};

/**
 * Cập nhật movie theo id
 * - Kiểm tra trùng title (ngoại trừ chính movie đang cập nhật)
 * - Kiểm tra genres tồn tại
 * - Nếu thay đổi release/end date, gọi `ensureMovieDateWindowNotShrunk` để
 *   đảm bảo không làm phá vỡ showtime hiện có
 * - Gán các trường mới lên document và lưu
 */
const updateMovieById = async (id, updateBody) => {
  const movie = await getMovieById(id);

  if (updateBody.title) {
    const existing = await Movie.findOne({
      _id: { $ne: id },
      title: {
        $regex: `^${escapeRegExp(updateBody.title.trim())}$`,
        $options: "i",
      },
    });
    if (existing) {
      throw ApiError.conflict(messages.CRUD.ALREADY_EXISTS("Movie"));
    }
  }

  if (updateBody.genres && updateBody.genres.length > 0) {
    const existingGenres = await Genre.countDocuments({
      _id: { $in: updateBody.genres },
    });
    if (existingGenres !== updateBody.genres.length) {
      throw ApiError.badRequest(messages.CRUD.NOT_FOUND("Genre"));
    }
  }

  const effectiveReleaseDate = updateBody.releaseDate || movie.releaseDate;
  const effectiveEndDate = updateBody.endDate || movie.endDate;

  ensureMovieDateRangeValid({
    releaseDate: effectiveReleaseDate,
    endDate: effectiveEndDate,
  });

  if (effectiveReleaseDate && effectiveEndDate) {
    await ensureMovieDateWindowNotShrunk({
      movieId: movie._id,
      releaseDate: effectiveReleaseDate,
      endDate: effectiveEndDate,
    });
  }

  Object.assign(movie, updateBody);
  await movie.save();
  return movie;
};

/**
 * Trước khi xoá movie, đảm bảo không có showtime hoặc booking đang hoạt động
 * - Nếu tồn tại showtimes, kiểm tra có booking ở trạng thái PENDING/CONFIRMED
 * - Nếu có booking active -> ném lỗi conflict (không thể xoá)
 * - Nếu chỉ có showtimes nhưng không có booking active -> ném lỗi báo movie có showtimes
 */
const ensureMovieHasNoShowtimesOrBookings = async (movieId) => {
  const showtimes = await Showtime.find({ movie: movieId }).select("_id");
  if (showtimes.length > 0) {
    const showtimeIds = showtimes.map((st) => st._id);
    const activeBookingCount = await Booking.countDocuments({
      showtime: { $in: showtimeIds },
      status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] },
    });

    if (activeBookingCount > 0) {
      throw ApiError.conflict(messages.VALIDATION.MOVIE_HAS_ACTIVE_BOOKINGS);
    }
    throw ApiError.conflict(messages.VALIDATION.MOVIE_HAS_SHOWTIMES);
  }
};

/**
 * Xoá movie (mềm)
 * - Kiểm tra tồn tại và đảm bảo không có showtime/booking active
 * - Gọi `softDelete` trên document (giữ record nhưng đánh dấu xoá)
 */
const deleteMovieById = async (id) => {
  const movie = await getMovieById(id);

  await ensureMovieHasNoShowtimesOrBookings(movie._id);

  await movie.softDelete();
  return movie;
};

module.exports = {
  createMovie,
  getMovies,
  getMovieById,
  updateMovieById,
  deleteMovieById,
};
