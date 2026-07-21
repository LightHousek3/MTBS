/**
 * Controller: Movie
 *
 * Chứa các handler được route gọi khi có request liên quan đến Movie.
 * Mỗi hàm ở đây trả về response thông qua `ResponseHandler` và sử dụng
 * `asyncHandler` để bắt lỗi bất đồng bộ (để middleware error xử lý chung).
 */

const { movieService } = require("../services");
const { asyncHandler, ResponseHandler, pick } = require("../utils");
const { messages } = require("../constants");

/**
 * Tạo một movie mới (Admin)
 * - Nhận dữ liệu từ `req.body` (đã được validate trước ở layer route)
 * - Gọi `movieService.createMovie` để lưu vào DB
 * - Trả về HTTP 201 với dữ liệu movie vừa tạo
 */
const createMovie = asyncHandler(async (req, res) => {
  const movie = await movieService.createMovie(req.body);
  ResponseHandler.created(res, {
    message: messages.CRUD.CREATED("Movie"),
    data: movie,
  });
});

/**
 * Lấy danh sách movies với filter và pagination
 * - `filter`: các trường lọc lấy từ `req.query` (title, genres, type, ...)
 * - `options`: các tuỳ chọn phân trang/sắp xếp/populate
 * - Trả về kết quả đã phân trang (mảng `results` + `meta`)
 */
const getMovies = asyncHandler(async (req, res) => {
  const filter = pick(req.query, [
    "keyword",
    "title",
    "genres",
    "type",
    "origin",
    "ageRating",
    "releaseDate",
    "endDate",
    "availableForShowtime",
    "location",
  ]); // {} nếu không muốn lọc theo trường nào
  const options = pick(req.query, ["sortBy", "limit", "page", "populate"]);
  const result = await movieService.getMovies(filter, options);

  ResponseHandler.paginated(res, {
    message: messages.CRUD.LIST_FETCHED("Movies"),
    data: result.results,
    meta: result.meta,
  });
});

/**
 * Lấy chi tiết 1 movie theo `id` (params)
 * - Nếu không tìm thấy, service có thể ném lỗi (vd. ApiError) để middleware xử lý
 */
const getMovie = asyncHandler(async (req, res) => {
  const movie = await movieService.getMovieById(req.params.id);
  ResponseHandler.success(res, {
    message: messages.CRUD.FETCHED("Movie"),
    data: movie,
  });
});

/**
 * Cập nhật movie theo `id`
 * - Dữ liệu cập nhật lấy từ `req.body` (đã được validate)
 * - Trả về object movie sau khi cập nhật
 */
const updateMovie = asyncHandler(async (req, res) => {
  const movie = await movieService.updateMovieById(req.params.id, req.body);
  ResponseHandler.success(res, {
    message: messages.CRUD.UPDATED("Movie"),
    data: movie,
  });
});

/**
 * Xoá movie theo `id`
 * - Gọi service để xoá, sau đó trả về message thành công
 */
const deleteMovie = asyncHandler(async (req, res) => {
  await movieService.deleteMovieById(req.params.id);
  ResponseHandler.success(res, {
    message: messages.CRUD.DELETED("Movie"),
  });
});

/**
 * Lấy danh sách phim đang chiếu (Now Showing)
 * - Xác định thời điểm hiện tại `now` và lọc theo khoảng releaseDate <= now <= endDate
 * - Nếu có `location` trong query thì thêm điều kiện lọc theo địa điểm
 */
const getNowShowingMovies = asyncHandler(async (req, res) => {
  const now = new Date();
  const filter = { releaseDate: { $lte: now }, endDate: { $gte: now } };
  if (req.query.location) {
    filter.location = req.query.location;
  }
  const options = pick(req.query, ["sortBy", "limit", "page", "populate"]);
  const result = await movieService.getMovies(filter, options);

  ResponseHandler.paginated(res, {
    message: messages.CRUD.LIST_FETCHED("Now Showing Movies"),
    data: result.results,
    meta: result.meta,
  });
});

/**
 * Lấy danh sách phim sắp ra mắt (Upcoming)
 * - Lọc theo `releaseDate` > now
 * - Hỗ trợ lọc theo `location` nếu được cung cấp
 */
const getUpcomingMovies = asyncHandler(async (req, res) => {
  const now = new Date();
  const filter = { releaseDate: { $gt: now } };
  if (req.query.location) {
    filter.location = req.query.location;
  }
  const options = pick(req.query, ["sortBy", "limit", "page", "populate"]);
  const result = await movieService.getMovies(filter, options);

  ResponseHandler.paginated(res, {
    message: messages.CRUD.LIST_FETCHED("Upcoming Movies"),
    data: result.results,
    meta: result.meta,
  });
});

module.exports = {
  createMovie,
  getMovies,
  getMovie,
  updateMovie,
  deleteMovie,
  getNowShowingMovies,
  getUpcomingMovies,
};
