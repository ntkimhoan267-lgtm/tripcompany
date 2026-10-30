const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const config = require('../config');
const google = require('../lib/google');
const { csrf, requireAdmin } = require('../lib/security');
const { slugify, setSettings, getSettings, fmtDate, parseVideo } = require('../lib/helpers');
const { leadServiceOptions } = require('../data/services');

const router = express.Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '') || '.jpg';
      cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)),
});

// multer phải chạy trước csrf để đọc được _csrf trong form multipart
const withUpload = (field) => upload.single(field);

router.use((req, res, next) => {
  res.locals.adminUser = req.session.username;
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  res.locals.googleReady = google.isConfigured();
  next();
});
const flash = (req, type, msg) => { req.session.flash = { type, msg }; };

const LEAD_STATUSES = { new: 'Mới', contacting: 'Đang tư vấn', won: 'Đã chốt', lost: 'Không chốt' };
router.use((req, res, next) => { res.locals.LEAD_STATUSES = LEAD_STATUSES; next(); });

// ---------- Đăng nhập ----------
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false });

router.get('/login', csrf, (req, res) => {
  if (req.session.userId) return res.redirect('/admin');
  res.render('admin/login', { error: null, next: req.query.next || '/admin' });
});

router.post('/login', loginLimiter, csrf, (req, res) => {
  const { username, password } = req.body;
  const rawNext = String(req.body.next || '');
  const nextUrl = /^\/admin(\/|$|\?)/.test(rawNext) ? rawNext : '/admin';
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(String(username || '').trim());
  if (!user || !bcrypt.compareSync(String(password || ''), user.password_hash)) {
    return res.status(401).render('admin/login', { error: 'Sai tên đăng nhập hoặc mật khẩu.', next: nextUrl });
  }
  req.session.userId = user.id;
  req.session.username = user.username;
  res.redirect(nextUrl);
});

router.post('/logout', csrf, (req, res) => {
  req.session = null;
  res.redirect('/admin/login');
});

router.use(requireAdmin);

// ---------- Tổng quan ----------
router.get('/', csrf, (req, res) => {
  const count = (sql, ...a) => db.prepare(sql).get(...a).n;
  const stats = {
    leadsToday: count("SELECT COUNT(*) AS n FROM leads WHERE date(created_at, '+7 hours') = date('now', '+7 hours')"),
    leads7: count("SELECT COUNT(*) AS n FROM leads WHERE created_at >= datetime('now', '-7 days')"),
    leads30: count("SELECT COUNT(*) AS n FROM leads WHERE created_at >= datetime('now', '-30 days')"),
    leadsNew: count("SELECT COUNT(*) AS n FROM leads WHERE status = 'new'"),
    subscribers: count("SELECT COUNT(*) AS n FROM subscribers WHERE status = 'active'"),
    subs30: count("SELECT COUNT(*) AS n FROM subscribers WHERE created_at >= datetime('now', '-30 days')"),
    posts: count("SELECT COUNT(*) AS n FROM posts WHERE status = 'published'"),
    unsynced: count('SELECT COUNT(*) AS n FROM leads WHERE sheet_synced = 0') + count('SELECT COUNT(*) AS n FROM subscribers WHERE sheet_synced = 0'),
  };
  // Lead theo ngày (30 ngày, giờ VN)
  const rows = db.prepare(`SELECT date(created_at, '+7 hours') AS d, COUNT(*) AS n FROM leads
    WHERE created_at >= datetime('now', '-30 days') GROUP BY d`).all();
  const byDay = Object.fromEntries(rows.map((r) => [r.d, r.n]));
  const chart = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() + 7 * 3600e3 - i * 86400e3).toISOString().slice(0, 10);
    chart.push({ d, n: byDay[d] || 0 });
  }
  const topServices = db.prepare(`SELECT service, COUNT(*) AS n FROM leads WHERE created_at >= datetime('now', '-30 days')
    GROUP BY service ORDER BY n DESC LIMIT 6`).all();
  const recent = db.prepare('SELECT * FROM leads ORDER BY id DESC LIMIT 8').all();
  res.render('admin/dashboard', { title: 'Tổng quan', stats, chart, topServices, recent });
});

// ---------- Khách tư vấn ----------
function leadFilter(q) {
  const where = []; const args = [];
  if (q.status && LEAD_STATUSES[q.status]) { where.push('status = ?'); args.push(q.status); }
  if (q.service) { where.push('service = ?'); args.push(q.service); }
  if (q.from) { where.push("date(created_at, '+7 hours') >= ?"); args.push(q.from); }
  if (q.to) { where.push("date(created_at, '+7 hours') <= ?"); args.push(q.to); }
  if (q.q) { where.push('(name LIKE ? OR phone LIKE ? OR note LIKE ?)'); const s = `%${q.q}%`; args.push(s, s, s); }
  return { sql: where.length ? 'WHERE ' + where.join(' AND ') : '', args };
}

router.get('/leads', csrf, (req, res) => {
  const q = { status: req.query.status || '', service: req.query.service || '', from: req.query.from || '', to: req.query.to || '', q: req.query.q || '' };
  const f = leadFilter(q);
  const perPage = 30;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const total = db.prepare(`SELECT COUNT(*) AS n FROM leads ${f.sql}`).get(...f.args).n;
  const leads = db.prepare(`SELECT * FROM leads ${f.sql} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...f.args, perPage, (page - 1) * perPage);
  res.render('admin/leads', { title: 'Khách tư vấn', leads, q, total, page, pages: Math.max(1, Math.ceil(total / perPage)), leadServiceOptions });
});

router.post('/leads/:id', csrf, (req, res) => {
  const status = LEAD_STATUSES[req.body.status] ? req.body.status : 'new';
  db.prepare('UPDATE leads SET status = ?, admin_note = ? WHERE id = ?').run(status, String(req.body.admin_note || '').slice(0, 2000), req.params.id);
  if (req.get('x-requested-with') === 'fetch') return res.json({ ok: true });
  flash(req, 'success', 'Đã cập nhật khách hàng.');
  res.redirect(req.get('referer') || '/admin/leads');
});

router.post('/leads/:id/delete', csrf, (req, res) => {
  db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
  flash(req, 'success', 'Đã xoá khách hàng.');
  res.redirect('/admin/leads');
});

const csvCell = (v) => {
  let s = String(v == null ? '' : v);
  if (/^[=+\-@]/.test(s)) s = "'" + s; // chống CSV injection khi mở bằng Excel
  return `"${s.replace(/"/g, '""')}"`;
};
const sendCsv = (res, filename, header, rows) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n'));
};

router.get('/leads.csv', (req, res) => {
  const f = leadFilter(req.query);
  const rows = db.prepare(`SELECT * FROM leads ${f.sql} ORDER BY id DESC`).all(...f.args);
  sendCsv(res, `trip-khach-tu-van-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Thời gian', 'Họ tên', 'SĐT', 'Dịch vụ', 'Ghi chú khách', 'Trạng thái', 'Ghi chú nội bộ', 'Trang nguồn'],
    rows.map((l) => [fmtDate(l.created_at, true), l.name, l.phone, l.service, l.note, LEAD_STATUSES[l.status], l.admin_note, l.source_page]));
});

// ---------- Người đăng ký nhận tin ----------
router.get('/subscribers', csrf, (req, res) => {
  const q = String(req.query.q || '');
  const rows = q
    ? db.prepare('SELECT * FROM subscribers WHERE email LIKE ? OR name LIKE ? ORDER BY id DESC').all(`%${q}%`, `%${q}%`)
    : db.prepare('SELECT * FROM subscribers ORDER BY id DESC').all();
  res.render('admin/subscribers', { title: 'Đăng ký nhận tin', subscribers: rows, q });
});

router.post('/subscribers/:id/delete', csrf, (req, res) => {
  db.prepare('DELETE FROM subscribers WHERE id = ?').run(req.params.id);
  flash(req, 'success', 'Đã xoá email khỏi danh sách.');
  res.redirect('/admin/subscribers');
});

router.get('/subscribers.csv', (req, res) => {
  const rows = db.prepare('SELECT * FROM subscribers ORDER BY id DESC').all();
  sendCsv(res, `trip-dang-ky-nhan-tin-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Thời gian', 'Email', 'Tên', 'Trạng thái', 'Trang nguồn'],
    rows.map((s) => [fmtDate(s.created_at, true), s.email, s.name, s.status === 'active' ? 'Đang nhận' : 'Đã huỷ', s.source_page]));
});

// ---------- Bản tin tháng ----------
router.get('/newsletter', csrf, (req, res) => {
  const tours = db.prepare("SELECT * FROM tours WHERE status = 'published' ORDER BY featured DESC, sort").all();
  const history = db.prepare('SELECT * FROM newsletters ORDER BY id DESC LIMIT 20').all();
  const active = db.prepare("SELECT COUNT(*) AS n FROM subscribers WHERE status = 'active'").get().n;
  res.render('admin/newsletter', { title: 'Gửi bản tin tháng', tours, history, active });
});

router.post('/newsletter', csrf, async (req, res) => {
  const subject = String(req.body.subject || '').trim().slice(0, 200);
  const body = String(req.body.body || '').trim().slice(0, 20000);
  const tourIds = [].concat(req.body.tours || []).map(Number).filter(Boolean);
  const testOnly = req.body.mode === 'test';
  if (!subject || !body) { flash(req, 'error', 'Vui lòng nhập tiêu đề và nội dung.'); return res.redirect('/admin/newsletter'); }
  if (!google.isConfigured()) { flash(req, 'error', 'Chưa cấu hình Google Apps Script (GOOGLE_SCRIPT_URL) nên chưa gửi được email.'); return res.redirect('/admin/newsletter'); }

  const tours = tourIds.length
    ? db.prepare(`SELECT * FROM tours WHERE id IN (${tourIds.map(() => '?').join(',')})`).all(...tourIds)
        .map((t) => ({ title: t.title, duration: t.duration, departure: t.departure, price: t.price, url: `${config.siteUrl}/tour/${t.slug}`, image: t.image ? (t.image.startsWith('http') ? t.image : config.siteUrl + t.image) : '' }))
    : [];
  const recipients = testOnly
    ? (getSettings().notify_emails || '').split(/[,;\s]+/).filter(Boolean).map((email) => ({ email, token: '' }))
    : db.prepare("SELECT email, token FROM subscribers WHERE status = 'active'").all();
  if (!recipients.length) { flash(req, 'error', 'Chưa có người đăng ký nào để gửi.'); return res.redirect('/admin/newsletter'); }

  const r = await google.callScript('newsletter', { subject, body, tours, recipients }, 120000);
  if (!testOnly) {
    db.prepare('INSERT INTO newsletters (subject, body, recipients, result) VALUES (?, ?, ?, ?)')
      .run(subject, body, recipients.length, r.ok ? `Đã gửi ${r.sent ?? recipients.length}` : `Lỗi: ${r.error}`);
  }
  flash(req, r.ok ? 'success' : 'error', r.ok
    ? (testOnly ? `Đã gửi thử tới ${recipients.map((x) => x.email).join(', ')}.` : `Đã gửi bản tin tới ${r.sent ?? recipients.length} người.`)
    : `Gửi thất bại: ${r.error}`);
  res.redirect('/admin/newsletter');
});

// ---------- Blog ----------
router.get('/posts', csrf, (req, res) => {
  const posts = db.prepare('SELECT * FROM posts ORDER BY COALESCE(published_at, created_at) DESC').all();
  res.render('admin/posts', { title: 'Bài viết', posts });
});

router.get('/posts/new', csrf, (req, res) => res.render('admin/post-form', { title: 'Viết bài mới', post: { status: 'draft' } }));
router.get('/posts/:id', csrf, (req, res, next) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return next();
  res.render('admin/post-form', { title: 'Sửa bài viết', post });
});

function uniqueSlug(table, base, id) {
  let slug = base || 'bai-viet';
  for (let i = 2; db.prepare(`SELECT id FROM ${table} WHERE slug = ? AND id != ?`).get(slug, id || 0); i++) slug = `${base}-${i}`;
  return slug;
}

router.post(['/posts/new', '/posts/:id'], withUpload('cover_file'), csrf, (req, res) => {
  const id = req.params.id ? Number(req.params.id) : null;
  const b = req.body;
  const title = String(b.title || '').trim().slice(0, 200);
  if (!title) { flash(req, 'error', 'Bài viết cần có tiêu đề.'); return res.redirect(req.originalUrl); }
  const slug = uniqueSlug('posts', slugify(b.slug || title), id);
  const cover = req.file ? `/uploads/${req.file.filename}` : (b.remove_cover ? null : (String(b.cover || '').trim() || null));
  const status = b.status === 'published' ? 'published' : 'draft';
  const fields = [slug, title, String(b.excerpt || '').slice(0, 400), String(b.content || ''), cover, String(b.category || '').trim().slice(0, 50), status];
  if (id) {
    db.prepare(`UPDATE posts SET slug=?, title=?, excerpt=?, content=?, cover=?, category=?, status=?,
      published_at = CASE WHEN ? = 'published' AND published_at IS NULL THEN datetime('now') ELSE published_at END,
      updated_at = datetime('now') WHERE id = ?`).run(...fields, status, id);
  } else {
    db.prepare(`INSERT INTO posts (slug, title, excerpt, content, cover, category, status, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'published' THEN datetime('now') END)`).run(...fields, status);
  }
  flash(req, 'success', status === 'published' ? 'Đã lưu và xuất bản bài viết.' : 'Đã lưu bản nháp.');
  res.redirect('/admin/posts');
});

router.post('/posts/:id/delete', csrf, (req, res) => {
  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  flash(req, 'success', 'Đã xoá bài viết.');
  res.redirect('/admin/posts');
});

// Upload ảnh chèn vào nội dung bài viết
router.post('/upload', withUpload('file'), csrf, (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: 'Chỉ nhận ảnh JPG, PNG, WEBP, GIF tối đa 5MB.' });
  res.json({ ok: true, url: `/uploads/${req.file.filename}` });
});

// ---------- Tour ----------
const TOUR_REGIONS = { 'quoc-te': 'Nước ngoài', 'trong-nuoc': 'Trong nước', 'trong-ngay': 'Trong ngày' };
router.use((req, res, next) => { res.locals.TOUR_REGIONS = TOUR_REGIONS; next(); });

router.get('/tours', csrf, (req, res) => {
  res.render('admin/tours', { title: 'Tour', tours: db.prepare('SELECT * FROM tours ORDER BY featured DESC, sort, id').all() });
});
router.get('/tours/new', csrf, (req, res) => res.render('admin/tour-form', { title: 'Thêm tour', tour: { status: 'published', region: 'quoc-te', departure: 'Đà Nẵng' } }));
router.get('/tours/:id', csrf, (req, res, next) => {
  const tour = db.prepare('SELECT * FROM tours WHERE id = ?').get(req.params.id);
  if (!tour) return next();
  res.render('admin/tour-form', { title: 'Sửa tour', tour });
});

router.post(['/tours/new', '/tours/:id'], withUpload('image_file'), csrf, (req, res) => {
  const id = req.params.id ? Number(req.params.id) : null;
  const b = req.body;
  const title = String(b.title || '').trim().slice(0, 200);
  if (!title) { flash(req, 'error', 'Tour cần có tên.'); return res.redirect(req.originalUrl); }
  const price = String(b.price || '').replace(/\D/g, '');
  const image = req.file ? `/uploads/${req.file.filename}` : (b.remove_image ? null : (String(b.image || '').trim() || null));
  const fields = [
    uniqueSlug('tours', slugify(b.slug || title), id), title, String(b.destination || '').slice(0, 100),
    TOUR_REGIONS[b.region] ? b.region : 'quoc-te', String(b.duration || '').slice(0, 50), String(b.departure || '').slice(0, 100),
    price ? Number(price) : null, image, String(b.highlights || '').slice(0, 2000), String(b.itinerary || ''),
    b.status === 'hidden' ? 'hidden' : 'published', b.featured ? 1 : 0, Number(b.sort) || 0,
  ];
  if (id) {
    db.prepare(`UPDATE tours SET slug=?, title=?, destination=?, region=?, duration=?, departure=?, price=?, image=?, highlights=?, itinerary=?,
      status=?, featured=?, sort=?, updated_at=datetime('now') WHERE id = ?`).run(...fields, id);
  } else {
    db.prepare(`INSERT INTO tours (slug, title, destination, region, duration, departure, price, image, highlights, itinerary, status, featured, sort)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(...fields);
  }
  flash(req, 'success', 'Đã lưu tour.');
  res.redirect('/admin/tours');
});

router.post('/tours/:id/delete', csrf, (req, res) => {
  db.prepare('DELETE FROM tours WHERE id = ?').run(req.params.id);
  flash(req, 'success', 'Đã xoá tour.');
  res.redirect('/admin/tours');
});

// ---------- Cài đặt ----------
const SETTING_KEYS = ['hotline', 'hotline_translation', 'zalo', 'facebook', 'messenger', 'email', 'hero_video', 'hero_teaser', 'popup_newsletter_delay', 'notify_emails'];

router.get('/settings', csrf, (req, res) => {
  res.render('admin/settings', { title: 'Cài đặt website', s: getSettings(), parseVideo });
});

router.post('/settings', csrf, (req, res) => {
  const update = {};
  for (const k of SETTING_KEYS) update[k] = String(req.body[k] || '').trim().slice(0, 500);
  update.popup_newsletter_enabled = req.body.popup_newsletter_enabled ? '1' : '0';
  setSettings(update);
  flash(req, 'success', 'Đã lưu cài đặt.');
  res.redirect('/admin/settings');
});

// Gửi lại các bản ghi chưa đồng bộ Google Sheet
router.post('/sync', csrf, async (req, res) => {
  if (!google.isConfigured()) { flash(req, 'error', 'Chưa cấu hình GOOGLE_SCRIPT_URL.'); return res.redirect('/admin'); }
  let ok = 0; let fail = 0;
  for (const l of db.prepare('SELECT * FROM leads WHERE sheet_synced = 0 ORDER BY id LIMIT 50').all()) ((await google.syncLead({ ...l, resync: true })).ok ? ok++ : fail++);
  for (const s of db.prepare('SELECT * FROM subscribers WHERE sheet_synced = 0 ORDER BY id LIMIT 50').all()) ((await google.syncSubscriber({ ...s, resync: true })).ok ? ok++ : fail++);
  flash(req, fail ? 'error' : 'success', `Đồng bộ Google Sheet: ${ok} thành công${fail ? `, ${fail} lỗi` : ''}.`);
  res.redirect('/admin');
});

router.post('/test-google', csrf, async (req, res) => {
  const r = await google.callScript('ping', {});
  flash(req, r.ok ? 'success' : 'error', r.ok ? `Kết nối Google thành công. Sheet: ${r.sheetUrl || ''}` : `Kết nối Google thất bại: ${r.error}`);
  res.redirect('/admin/settings');
});

// ---------- Tài khoản ----------
router.get('/account', csrf, (req, res) => {
  res.render('admin/account', { title: 'Tài khoản', users: db.prepare('SELECT id, username, created_at FROM users ORDER BY id').all() });
});

router.post('/account/password', csrf, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  const { current, password, confirm } = req.body;
  if (!bcrypt.compareSync(String(current || ''), user.password_hash)) flash(req, 'error', 'Mật khẩu hiện tại không đúng.');
  else if (String(password || '').length < 8) flash(req, 'error', 'Mật khẩu mới cần tối thiểu 8 ký tự.');
  else if (password !== confirm) flash(req, 'error', 'Xác nhận mật khẩu không khớp.');
  else {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), user.id);
    flash(req, 'success', 'Đã đổi mật khẩu.');
  }
  res.redirect('/admin/account');
});

router.post('/account/users', csrf, (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) flash(req, 'error', 'Tên đăng nhập 3–30 ký tự, chỉ gồm chữ thường, số, dấu . _ -');
  else if (password.length < 8) flash(req, 'error', 'Mật khẩu tối thiểu 8 ký tự.');
  else if (db.prepare('SELECT id FROM users WHERE username = ?').get(username)) flash(req, 'error', 'Tên đăng nhập đã tồn tại.');
  else {
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, bcrypt.hashSync(password, 10));
    flash(req, 'success', `Đã tạo tài khoản ${username}.`);
  }
  res.redirect('/admin/account');
});

router.post('/account/users/:id/delete', csrf, (req, res) => {
  if (Number(req.params.id) === req.session.userId) flash(req, 'error', 'Không thể xoá tài khoản đang đăng nhập.');
  else { db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id); flash(req, 'success', 'Đã xoá tài khoản.'); }
  res.redirect('/admin/account');
});

module.exports = router;
