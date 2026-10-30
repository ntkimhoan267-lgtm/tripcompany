const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const cookieSession = require('cookie-session');
const config = require('./src/config');
const { seed } = require('./src/seed');
const helpers = require('./src/lib/helpers');
const company = require('./src/data/company');

seed();

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'img-src': ["'self'", 'data:', 'https:'],
      'media-src': ["'self'", 'https:'],
      'frame-src': ['https://drive.google.com', 'https://www.youtube-nocookie.com', 'https://www.google.com', 'https://maps.google.com'],
      'connect-src': ["'self'"],
      'upgrade-insecure-requests': config.isProd ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(express.static(path.join(__dirname, 'public'), { maxAge: config.isProd ? '7d' : 0 }));
// Ảnh do admin tải lên: chỉ phục vụ như ảnh, không bao giờ chạy được script hay hiển thị như trang HTML
app.use('/uploads', express.static(config.uploadDir, {
  maxAge: '30d',
  setHeaders: (res) => {
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox");
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieSession({
  name: 'trip_sess',
  secret: config.sessionSecret,
  httpOnly: true,
  sameSite: 'lax',
  secure: config.isProd,
  maxAge: 7 * 24 * 60 * 60 * 1000,
}));

// Phiên bản tài nguyên tĩnh: đổi mỗi lần khởi động để trình duyệt tải CSS/JS mới sau khi cập nhật
const ASSET_VERSION = Date.now().toString(36);

// Biến dùng chung cho mọi view
app.use((req, res, next) => {
  res.locals.assetV = ASSET_VERSION;
  res.locals.h = helpers;
  res.locals.icon = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  res.locals.flag = (code) => `https://flagcdn.com/w80/${code}.png`;
  res.locals.company = company;
  res.locals.settings = helpers.getSettings();
  res.locals.siteUrl = config.siteUrl;
  res.locals.path = req.path;
  res.locals.leadServiceOptions = require('./src/data/services').leadServiceOptions;
  next();
});

app.use('/api', require('./src/routes/api'));
app.use('/admin', require('./src/routes/admin'));
app.use('/', require('./src/routes/public'));

app.use((req, res) => res.status(404).render('pages/404', { meta: { title: 'Không tìm thấy trang' } }));
app.use((err, req, res, _next) => {
  // Lỗi do request sai (JSON hỏng, body quá lớn...) trả đúng mã 4xx; còn lại là lỗi máy chủ
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  const message = status === 413 ? 'Dữ liệu gửi lên quá lớn.' : status < 500 ? 'Yêu cầu không hợp lệ.' : 'Đã có lỗi xảy ra. Vui lòng thử lại sau.';
  if (res.headersSent) return;
  res.status(status);
  if (req.path.startsWith('/api/') || req.accepts(['html', 'json']) === 'json') return res.json({ ok: false, error: message });
  res.send(message);
});

process.on('unhandledRejection', (reason) => console.error('[unhandledRejection]', reason));

if (require.main === module) {
  app.listen(config.port, () => console.log(`TRIP website đang chạy tại http://localhost:${config.port}`));
}

module.exports = app;
