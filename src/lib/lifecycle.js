// Trạng thái vòng đời máy chủ: khi đang tắt (SIGTERM lúc deploy) thì không nhận việc dài mới như gửi bản tin.
module.exports = { shuttingDown: false };
