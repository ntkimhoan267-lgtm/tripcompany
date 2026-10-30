const crypto = require('node:crypto');

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

function requireAdmin(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.redirect('/admin/login?next=' + encodeURIComponent(req.originalUrl));
}

module.exports = { csrf, requireAdmin };
