const crypto = require('node:crypto');
const db = require('../db');

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// CSRF: token lưu trong session, gửi kèm form (_csrf) hoặc header X-CSRF-Token
function csrf(req, res, next) {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('hex');
  res.locals.csrfToken = req.session.csrf;
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const token = (req.body && req.body._csrf) || req.get('x-csrf-token');
  const a = Buffer.from(String(token || ''));
  const b = Buffer.from(req.session.csrf);
  if (a.length === b.length && crypto.timingSafeEqual(a, b)) return next();
  res.status(403);
  if (req.accepts(['html', 'json']) === 'json') return res.json({ ok: false, error: 'Phiên làm việc đã hết hạn, vui lòng tải lại trang.' });
  return res.send('Phiên làm việc đã hết hạn, vui lòng quay lại và tải lại trang.');
}

// Cookie phiên là "stateless" nên phải đối chiếu với database mỗi request:
// tài khoản còn tồn tại, session_version khớp (tăng khi đăng xuất / đổi mật khẩu) và chưa quá hạn tuyệt đối.
function requireAdmin(req, res, next) {
  const s = req.session || {};
  const user = s.userId && db.prepare('SELECT id, username, session_version FROM users WHERE id = ?').get(s.userId);
  const fresh = typeof s.iat === 'number' && Date.now() - s.iat < SESSION_MAX_AGE_MS;
  if (user && fresh && s.sv === user.session_version) {
    req.user = user;
    res.locals.adminUser = user.username;
    return next();
  }
  req.session = null;
  // Request gọi bằng fetch (nút lưu nhanh, tải ảnh): trả 401 JSON thay vì chuyển hướng sang trang đăng nhập,
  // nếu không fetch sẽ đi theo redirect, nhận trang HTML 200 và báo nhầm "Đã lưu".
  if (req.get('x-requested-with') === 'fetch' || req.accepts(['html', 'json']) === 'json') {
    return res.status(401).json({ ok: false, error: 'Phiên đăng nhập đã hết hạn. Vui lòng tải lại trang và đăng nhập lại.', login: '/admin/login' });
  }
  return res.redirect('/admin/login?next=' + encodeURIComponent(req.originalUrl));
}

// Bọc route async để lỗi được chuyển cho error handler thay vì làm sập process (Express 4)
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { csrf, requireAdmin, ah, SESSION_MAX_AGE_MS };
