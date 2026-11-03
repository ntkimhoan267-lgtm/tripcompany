const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cookieSession = require('cookie-session');
const config = require('./src/config');
const { seed } = require('./src/seed');
const helpers = require('./src/lib/helpers');
const company = require('./src/data/company');

seed();

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
// Số tầng proxy phía trước (Render: thường là 1). Kiểm tra bằng SHOW_CLIENT_IP=1 rồi mở /__ip sau khi triển khai.
const tp = process.env.TRUST_PROXY;
app.set('trust proxy', tp === undefined || tp === '' ? 1 : (/^\d+$/.test(tp) ? Number(tp) : tp));
app.disable('x-powered-by');

// Kiểm tra sức khoẻ cho Render: có truy cập được database không
app.get('/healthz', (req, res) => {
  try { require('./src/db').prepare('SELECT 1').get(); res.set('Cache-Control', 'no-store').send('ok'); }
  catch (e) { res.status(500).send('db error'); }
});

// Chỉ bật tạm khi cần xác định đúng TRUST_PROXY (biến môi trường SHOW_CLIENT_IP=1), tắt ngay sau đó
if (process.env.SHOW_CLIENT_IP === '1') {
  app.get('/__ip', (req, res) => res.set('Cache-Control', 'no-store').json({ ip: req.ip, ips: req.ips, xff: req.get('x-forwarded-for') || null }));
}

// Production: www.tripdn.com -> tripdn.com; khi FORCE_CANONICAL_HOST=1 (bật sau khi tên miền đã chạy),
// mọi tên miền khác (vd *.onrender.com) cũng chuyển về SITE_URL để tránh trùng lặp nội dung
if (config.isProd) {
  const siteHost = new URL(config.siteUrl).host;
  app.use((req, res, next) => {
    const host = (req.get('host') || '').toLowerCase();
    if (host === siteHost || req.path === '/healthz') return next();
    if (host === 'www.' + siteHost || process.env.FORCE_CANONICAL_HOST === '1') return res.redirect(301, config.siteUrl + req.originalUrl);
    next();
  });
}

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

app.use(compression());
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: config.isProd ? '30d' : 0,
  setHeaders(res, filePath) {
    // CSS/JS được gắn ?v=ASSET_VERSION nên cache lâu được; ảnh/video 30 ngày
    if (config.isProd && /\.(css|js)$/.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  },
}));
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

// Trang công khai: không ngắt dòng giữa từ ghép tiếng Việt ("chuyên nghiệp", "Đà Nẵng"…)
const nowrap = require('./src/lib/nowrap');
app.use((req, res, next) => {
  if (req.path.startsWith('/admin')) return next();
  const render = res.render.bind(res);
  res.render = (view, opts, cb) => {
    if (typeof opts === 'function') { cb = opts; opts = {}; }
    render(view, opts, (err, html) => {
      if (!err) html = nowrap(html);
      if (cb) return cb(err, html);
      if (err) return req.next(err);
      // HTML luôn kiểm tra lại với server để thay đổi trong Dashboard hiện ngay
      if (!res.get('Cache-Control')) res.set('Cache-Control', 'no-cache');
      res.send(html);
    });
  };
  next();
});

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

app.use((req, res) => res.status(404).render('pages/404', { meta: { title: 'Không tìm thấy trang', robots: 'noindex' } }));
app.use((err, req, res, _next) => {
  // Lỗi do request sai (JSON hỏng, body quá lớn...) trả đúng mã 4xx; còn lại là lỗi máy chủ
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  const message = status === 413 ? 'Dữ liệu gửi lên quá lớn.' : status < 500 ? 'Yêu cầu không hợp lệ.' : 'Đã có lỗi xảy ra. Vui lòng thử lại sau.';
  if (res.headersSent) return _next(err);
  res.status(status);
  if (req.path.startsWith('/api/') || req.accepts(['html', 'json']) === 'json') return res.json({ ok: false, error: message });
  res.send(message);
});

process.on('unhandledRejection', (reason) => console.error('[unhandledRejection]', reason));

if (require.main === module) {
  app.listen(config.port, () => console.log(`TRIP website đang chạy tại http://localhost:${config.port}`));
  // Tự đồng bộ lại khách tư vấn / người đăng ký chưa lên Google Sheet (Google lỗi tạm thời) mỗi 10 phút
  const google = require('./src/lib/google');
  if (google.isConfigured()) {
    const db = require('./src/db');
    let running = false;
    setInterval(async () => {
      if (running) return; running = true;
      try {
        for (const l of db.prepare("SELECT * FROM leads WHERE sheet_synced = 0 AND created_at < datetime('now', '-2 minutes') ORDER BY id LIMIT 20").all()) await google.syncLead(l, false);
        for (const s of db.prepare("SELECT * FROM subscribers WHERE sheet_synced = 0 AND created_at < datetime('now', '-2 minutes') ORDER BY id LIMIT 20").all()) await google.syncSubscriber(s, false);
      } catch (e) { console.warn('[google] Tự đồng bộ lỗi:', e.message); } finally { running = false; }
    }, 10 * 60 * 1000).unref();
  }
}

module.exports = app;
