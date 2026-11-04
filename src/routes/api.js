const crypto = require('node:crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { leadServiceOptions } = require('../data/services');
const { isValidVnPhone, normalizePhone, isValidEmail } = require('../lib/helpers');
// Cùng một câu trả lời cho email mới / đã có / đã huỷ để không lộ ai đang trong danh sách
const SUBSCRIBE_OK = 'Cảm ơn bạn! Mỗi tháng TRIP sẽ gửi cập nhật visa và lịch tour mới nhất tới email này.';
const LEAD_OK = 'TRIP đã nhận thông tin! Tư vấn viên sẽ gọi lại cho bạn trong giờ làm việc.';
const REVIEW_OK = 'Cảm ơn bạn đã đánh giá! TRIP sẽ hiển thị sau khi xác nhận.';
const google = require('../lib/google');

const router = express.Router();

// Form gửi bằng JavaScript (fetch, JSON) nhận JSON; form gửi thường khi trình duyệt tắt/lỗi JavaScript
// (application/x-www-form-urlencoded) nhận trang HTML cảm ơn / báo lỗi để khách không thấy chữ JSON thô.
const wantsJson = (req) => req.is('application/json') || req.accepts(['html', 'json']) === 'json';
// Đường dẫn trang khách vừa gửi form (để nút "Quay lại" và ghi nguồn), chỉ nhận trang trong cùng website
function refererPath(req) {
  try {
    const u = new URL(req.get('referer') || '');
    if (u.host === req.get('host') && !u.pathname.startsWith('/api/')) return u.pathname + u.search;
  } catch { /* không có / không hợp lệ */ }
  return '';
}
function reply(req, res, status, body) {
  if (wantsJson(req)) return res.status(status).json(body);
  return res.status(status).render('pages/form-result', {
    meta: { title: body.ok ? 'Đã gửi thành công' : 'Chưa gửi được', robots: 'noindex' },
    result: body,
    back: refererPath(req) || '/',
  });
}
const limitHandler = (req, res, next, options) => reply(req, res, options.statusCode, options.message);

// skipFailedRequests: lần gửi bị báo lỗi (thiếu tên, sai số điện thoại…) không bị tính vào giới hạn,
// để khách sửa lại và gửi tiếp không bị chặn oan.
router.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipFailedRequests: true,
  handler: limitHandler,
  message: { ok: false, error: 'Bạn đã gửi quá nhiều lần. Vui lòng thử lại sau ít phút hoặc gọi hotline.' },
}));

// Chỉ nhận request từ chính website (chống form giả mạo từ trang khác).
// "Origin: null" chỉ chấp nhận khi trình duyệt xác nhận cùng website (Sec-Fetch-Site: same-origin) —
// trình duyệt cũ / chính sách referrer chặt có thể gửi null cho form của chính trang.
router.use((req, res, next) => {
  const origin = req.get('origin');
  if (origin) {
    let host = null;
    try { host = new URL(origin).host; } catch { /* Origin: null hoặc giá trị lạ */ }
    const sameSiteNull = origin === 'null' && req.get('sec-fetch-site') === 'same-origin';
    if (host !== req.get('host') && !sameSiteNull) return reply(req, res, 403, { ok: false, error: 'Nguồn gửi không hợp lệ. Vui lòng tải lại trang rồi gửi lại, hoặc gọi hotline.' });
  }
  next();
});

const clean = (v, max) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);

router.post('/leads', (req, res) => {
  const b = req.body || {};
  if (b.website) return reply(req, res, 200, { ok: true, message: LEAD_OK }); // honeypot: bot điền trường ẩn
  const name = clean(b.name, 100);
  const phone = clean(b.phone, 20);
  const service = clean(b.service, 100);
  const note = clean(b.note, 1000);
  const source = clean(b.source, 200) || refererPath(req);

  const errors = {};
  if (name.length < 2) errors.name = 'Vui lòng nhập họ tên.';
  if (!isValidVnPhone(phone)) errors.phone = 'Số điện thoại chưa đúng (VD: 0935 191 394).';
  if (!leadServiceOptions.includes(service)) errors.service = 'Vui lòng chọn dịch vụ cần tư vấn.';
  if (Object.keys(errors).length) return reply(req, res, 400, { ok: false, errors });

  const info = db.prepare('INSERT INTO leads (name, phone, service, note, source_page) VALUES (?, ?, ?, ?, ?)')
    .run(name, normalizePhone(phone), service, note, source);
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(info.lastInsertRowid);

  google.syncLead(lead).catch((e) => console.error(e)); // không bắt khách chờ Google
  reply(req, res, 200, { ok: true, message: LEAD_OK, service });
});

const subscribeLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false,
  skipFailedRequests: true, handler: limitHandler,
  message: { ok: false, error: 'Bạn đã đăng ký quá nhiều lần trong 1 giờ. Vui lòng thử lại sau.' } });

router.post('/subscribe', subscribeLimiter, (req, res) => {
  const b = req.body || {};
  if (b.website) return reply(req, res, 200, { ok: true, message: SUBSCRIBE_OK });
  const email = clean(b.email, 200).toLowerCase();
  const name = clean(b.name, 100);
  const source = clean(b.source, 200) || refererPath(req);
  if (!isValidEmail(email)) return reply(req, res, 400, { ok: false, errors: { email: 'Email chưa đúng định dạng.' } });

  const existing = db.prepare('SELECT * FROM subscribers WHERE email = ?').get(email);
  if (existing) {
    // Không tự kích hoạt lại email đã huỷ (tránh người khác đăng ký hộ); khách muốn nhận lại thì liên hệ TRIP
    return reply(req, res, 200, { ok: true, message: SUBSCRIBE_OK });
  }
  const info = db.prepare('INSERT INTO subscribers (email, name, source_page, token) VALUES (?, ?, ?, ?)')
    .run(email, name, source, crypto.randomBytes(16).toString('hex'));
  const sub = db.prepare('SELECT * FROM subscribers WHERE id = ?').get(info.lastInsertRowid);

  google.syncSubscriber(sub).catch((e) => console.error(e));
  reply(req, res, 200, { ok: true, message: SUBSCRIBE_OK });
});

// Khách tự gửi đánh giá: luôn ở trạng thái chờ duyệt, chỉ hiện lên web khi nhân viên duyệt
const reviewLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 3, standardHeaders: 'draft-7', legacyHeaders: false,
  skipFailedRequests: true, handler: limitHandler,
  message: { ok: false, error: 'Bạn đã gửi 3 đánh giá trong 1 giờ qua nên hệ thống tạm dừng nhận thêm. Vui lòng thử lại sau hoặc nhắn Zalo cho TRIP.' } });

router.post('/reviews', reviewLimiter, (req, res) => {
  const b = req.body || {};
  if (b.website) return reply(req, res, 200, { ok: true, message: REVIEW_OK });
  const name = clean(b.name, 60);
  const service = clean(b.service, 100);
  const content = clean(b.content, 1200);
  const rating = Math.round(Number(b.rating));
  const errors = {};
  if (name.length < 2) errors.name = 'Vui lòng nhập tên của bạn.';
  if (!(rating >= 1 && rating <= 5)) errors.rating = 'Vui lòng chọn số sao.';
  if (content.length < 15) errors.content = 'Bạn chia sẻ thêm một chút nhé (ít nhất 15 ký tự).';
  if (service && !leadServiceOptions.includes(service)) errors.service = 'Dịch vụ không hợp lệ.';
  const phone = clean(b.phone, 20);
  if (phone && !isValidVnPhone(phone)) errors.phone = 'Số điện thoại chưa đúng.';
  if (Object.keys(errors).length) return reply(req, res, 400, { ok: false, errors });
  db.prepare("INSERT INTO reviews (name, service, rating, content, source, status, phone) VALUES (?, ?, ?, ?, 'web', 'pending', ?)")
    .run(name, service, rating, content, phone ? normalizePhone(phone) : null);
  reply(req, res, 200, { ok: true, message: REVIEW_OK });
});

module.exports = router;
