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

// Kiểm tra sức khoẻ cho Render: đọc được database VÀ ghi được ổ đĩa dữ liệu (ổ đầy / mất ổ đĩa -> báo lỗi để Render cảnh báo)
const diskProbe = { at: 0, ok: false };
app.get('/healthz', (req, res) => {
  res.set('Cache-Control', 'no-store');
  try { require('./src/db').prepare('SELECT 1').get(); } catch (e) { return res.status(500).send('db error'); }
  // Thử ghi ổ đĩa tối đa 30 giây/lần (trang công khai, không để bị gọi dồn dập làm ghi đĩa liên tục)
  if (Date.now() - diskProbe.at > 30000) {
    try { require('node:fs').writeFileSync(path.join(config.dataDir, '.healthz'), String(Date.now())); diskProbe.ok = true; }
    catch (e) { diskProbe.ok = false; }
    diskProbe.at = Date.now();
  }
  if (!diskProbe.ok) return res.status(500).send('disk error');
  res.send('ok');
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
  // Mặc định của helmet là 'no-referrer', khiến trình duyệt gửi "Origin: null" khi form được gửi không qua JavaScript
  // -> form tư vấn bị chặn. Giữ Referer/Origin trong cùng website, chỉ gửi tên miền khi sang website khác.
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
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

// Cờ quốc gia lưu tại chỗ (public/img/flags, tải bằng `npm run flags`): không phụ thuộc CDN bên ngoài.
// Thiếu file thì tạm dùng flagcdn.com để trang vẫn hiển thị.
const LOCAL_FLAGS = new Set((() => { try { return require('node:fs').readdirSync(path.join(__dirname, 'public', 'img', 'flags')); } catch { return []; } })());
const flagUrl = (code) => (LOCAL_FLAGS.has(`${code}.png`) ? `/img/flags/${code}.png` : `https://flagcdn.com/w80/${code}.png`);

// Biến dùng chung cho mọi view
app.use((req, res, next) => {
  res.locals.assetV = ASSET_VERSION;
  res.locals.h = helpers;
  res.locals.icon = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  res.locals.flag = flagUrl;
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
  const lifecycle = require('./src/lib/lifecycle');
  const server = app.listen(config.port, () => console.log(`TRIP website đang chạy tại http://localhost:${config.port}`));
  // Tự đồng bộ lại khách tư vấn / người đăng ký chưa lên Google Sheet (Google lỗi tạm thời) mỗi 10 phút
  const google = require('./src/lib/google');
  let syncTimer = null;
  if (google.isConfigured()) {
    syncTimer = setInterval(() => {
      google.syncPending({ olderThanMinutes: 2, timeoutMs: 30000 })
        .then((r) => { if (!r.ok && !r.busy) console.warn('[google] Tự đồng bộ dừng:', r.error); })
        .catch((e) => console.warn('[google] Tự đồng bộ lỗi:', e.message));
    }, 10 * 60 * 1000);
    syncTimer.unref();
  }

  // Tắt gọn khi Render deploy (SIGTERM): ngừng nhận kết nối mới, không nhận việc dài mới (gửi bản tin),
  // chờ các request đang chạy xong (tối đa ~25 giây; Render cho 30 giây) rồi mới thoát.
  const GRACE_MS = Number(process.env.SHUTDOWN_GRACE_MS) || 25000;
  const shutdown = (signal) => {
    if (lifecycle.shuttingDown) return;
    lifecycle.shuttingDown = true;
    console.log(`[${signal}] Đang tắt, chờ tối đa ${Math.round(GRACE_MS / 1000)} giây cho các request đang chạy…`);
    if (syncTimer) clearInterval(syncTimer);
    server.close(() => { console.log('Đã tắt gọn.'); process.exit(0); });
    server.closeIdleConnections();
    setTimeout(() => { console.warn('Hết thời gian chờ, buộc tắt.'); server.closeAllConnections(); process.exit(1); }, GRACE_MS).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = app;
