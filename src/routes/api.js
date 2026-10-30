const crypto = require('node:crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { leadServiceOptions } = require('../data/services');
const { isValidVnPhone, normalizePhone, isValidEmail } = require('../lib/helpers');
const google = require('../lib/google');

const router = express.Router();

router.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { ok: false, error: 'Bạn đã gửi quá nhiều lần. Vui lòng thử lại sau ít phút hoặc gọi hotline.' },
}));

// Chỉ nhận request từ chính website (chống form giả mạo từ trang khác)
router.use((req, res, next) => {
  const origin = req.get('origin');
  if (origin && new URL(origin).host !== req.get('host')) {
    return res.status(403).json({ ok: false, error: 'Nguồn gửi không hợp lệ.' });
  }
  next();
});

const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);

router.post('/leads', (req, res) => {
  const b = req.body || {};
  if (b.website) return res.json({ ok: true }); // honeypot: bot điền trường ẩn
  const name = clean(b.name, 100);
  const phone = clean(b.phone, 20);
  const service = clean(b.service, 100);
  const note = clean(b.note, 1000);
  const source = clean(b.source, 200);

  const errors = {};
  if (name.length < 2) errors.name = 'Vui lòng nhập họ tên.';
  if (!isValidVnPhone(phone)) errors.phone = 'Số điện thoại chưa đúng (VD: 0935 191 394).';
  if (!leadServiceOptions.includes(service)) errors.service = 'Vui lòng chọn dịch vụ cần tư vấn.';
  if (Object.keys(errors).length) return res.status(400).json({ ok: false, errors });

  const info = db.prepare('INSERT INTO leads (name, phone, service, note, source_page) VALUES (?, ?, ?, ?, ?)')
    .run(name, normalizePhone(phone), service, note, source);
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(info.lastInsertRowid);

  google.syncLead(lead).catch((e) => console.error(e)); // không bắt khách chờ Google
  res.json({ ok: true, message: 'TRIP đã nhận thông tin! Tư vấn viên sẽ gọi lại cho bạn trong giờ làm việc.' });
});

router.post('/subscribe', (req, res) => {
  const b = req.body || {};
  if (b.website) return res.json({ ok: true });
  const email = clean(b.email, 200).toLowerCase();
  const name = clean(b.name, 100);
  const source = clean(b.source, 200);
  if (!isValidEmail(email)) return res.status(400).json({ ok: false, errors: { email: 'Email chưa đúng định dạng.' } });

  const existing = db.prepare('SELECT * FROM subscribers WHERE email = ?').get(email);
  if (existing) {
    if (existing.status !== 'active') db.prepare("UPDATE subscribers SET status = 'active' WHERE id = ?").run(existing.id);
    return res.json({ ok: true, message: 'Email này đã có trong danh sách nhận tin của TRIP. Cảm ơn bạn!' });
  }
  const info = db.prepare('INSERT INTO subscribers (email, name, source_page, token) VALUES (?, ?, ?, ?)')
    .run(email, name, source, crypto.randomBytes(16).toString('hex'));
  const sub = db.prepare('SELECT * FROM subscribers WHERE id = ?').get(info.lastInsertRowid);

  google.syncSubscriber(sub).catch((e) => console.error(e));
  res.json({ ok: true, message: 'Đăng ký thành công! Bạn sẽ nhận lịch tour & ưu đãi mới nhất mỗi tháng.' });
});

module.exports = router;
