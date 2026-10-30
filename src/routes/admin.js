const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const sharp = require('sharp');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const config = require('../config');
const google = require('../lib/google');
const company = require('../data/company');
const { csrf, requireAdmin, ah } = require('../lib/security');
const { slugify, setSettings, getSettings, fmtDate, parseVideo } = require('../lib/helpers');
const { leadServiceOptions } = require('../data/services');

const router = express.Router();

// ---------- Upload ảnh ----------
// Giữ file trong bộ nhớ, chỉ ghi ra đĩa SAU khi qua CSRF và sau khi sharp giải mã được thành ảnh thật.
// Ảnh luôn được mã hoá lại sang WebP: loại bỏ file giả mạo (html/js/svg), xoá EXIF/GPS, thu nhỏ ảnh quá lớn.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, fieldSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, /^image\/(jpeg|png|webp|gif|heic|heif|avif)$/.test(file.mimetype)),
});

const withUpload = (field) => (req, res, next) => upload.single(field)(req, res, (err) => {
  if (!err) return next();
  const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Ảnh quá lớn (tối đa 8MB).'
    : err.code === 'LIMIT_FIELD_VALUE' ? 'Nội dung quá dài (tối đa khoảng 2MB chữ).' : 'Không tải lên được tệp.';
  if (req.path === '/upload') return res.status(400).json({ ok: false, error: msg });
  flash(req, 'error', msg);
  return res.redirect(req.originalUrl);
});

async function saveImage(file) {
  if (!file) return null;
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.webp`;
  try {
    await sharp(file.buffer, { failOn: 'error' })
      .rotate() // xoay theo EXIF trước khi bỏ metadata
      .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(path.join(config.uploadDir, name));
  } catch {
    return null;
  }
  return `/uploads/${name}`;
}

router.use((req, res, next) => {
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  res.locals.googleReady = google.isConfigured();
  next();
});
const flash = (req, type, msg) => { req.session.flash = { type, msg }; };

const LEAD_STATUSES = { new: 'Mới', contacting: 'Đang tư vấn', won: 'Đã chốt', lost: 'Không chốt' };
router.use((req, res, next) => { res.locals.LEAD_STATUSES = LEAD_STATUSES; next(); });

// Tham số query chỉ nhận chuỗi (chặn ?status[]=... hay ?q[x]=...)
const qs = (v, max = 100) => (typeof v === 'string' ? v.slice(0, max) : '');
const pageOf = (v) => Math.min(1000, Math.max(1, parseInt(qs(v), 10) || 1));

// ---------- Đăng nhập ----------
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false });
// Thêm giới hạn theo tên đăng nhập để không thể né bằng cách đổi IP
const userLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: false, legacyHeaders: false,
  keyGenerator: (req) => 'u:' + qs(req.body && req.body.username, 60).trim().toLowerCase(),
  validate: { keyGeneratorIpFallback: false },
});

router.get('/login', csrf, (req, res) => {
  res.render('admin/login', { error: null, next: qs(req.query.next, 300) || '/admin' });
});

router.post('/login', loginLimiter, userLimiter, csrf, (req, res) => {
  const rawNext = qs(req.body.next, 300);
  const nextUrl = /^\/admin(\/|$|\?)/.test(rawNext) ? rawNext : '/admin';
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(qs(req.body.username, 60).trim().toLowerCase());
  if (!user || !bcrypt.compareSync(qs(req.body.password, 200), user.password_hash)) {
    return res.status(401).render('admin/login', { error: 'Sai tên đăng nhập hoặc mật khẩu.', next: nextUrl });
  }
  // Tạo phiên mới hoàn toàn (kể cả CSRF token) để chống session fixation
  req.session = { userId: user.id, sv: user.session_version, iat: Date.now(), csrf: crypto.randomBytes(24).toString('hex') };
  res.redirect(nextUrl);
});

router.post('/logout', requireAdmin, csrf, (req, res) => {
  // Tăng session_version: mọi cookie cũ của tài khoản này (kể cả bị sao chép) đều hết hiệu lực
  db.prepare('UPDATE users SET session_version = session_version + 1 WHERE id = ?').run(req.user.id);
  req.session = null;
  res.redirect('/admin/login');
});

router.use(requireAdmin);
router.use((req, res, next) => {
  res.locals.pendingReviews = db.prepare("SELECT COUNT(*) AS n FROM reviews WHERE status = 'pending'").get().n;
  next();
});

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
function leadQuery(query) {
  return { status: qs(query.status, 20), service: qs(query.service), from: qs(query.from, 10), to: qs(query.to, 10), q: qs(query.q) };
}
function leadFilter(q) {
  const where = []; const args = [];
  if (q.status && LEAD_STATUSES[q.status]) { where.push('status = ?'); args.push(q.status); }
  if (q.service) { where.push('service = ?'); args.push(q.service); }
  if (/^\d{4}-\d{2}-\d{2}$/.test(q.from)) { where.push("date(created_at, '+7 hours') >= ?"); args.push(q.from); }
  if (/^\d{4}-\d{2}-\d{2}$/.test(q.to)) { where.push("date(created_at, '+7 hours') <= ?"); args.push(q.to); }
  if (q.q) { where.push('(name LIKE ? OR phone LIKE ? OR note LIKE ?)'); const s = `%${q.q}%`; args.push(s, s, s); }
  return { sql: where.length ? 'WHERE ' + where.join(' AND ') : '', args };
}

router.get('/leads', csrf, (req, res) => {
  const q = leadQuery(req.query);
  const f = leadFilter(q);
  const perPage = 30;
  const page = pageOf(req.query.page);
  const total = db.prepare(`SELECT COUNT(*) AS n FROM leads ${f.sql}`).get(...f.args).n;
  const leads = db.prepare(`SELECT * FROM leads ${f.sql} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...f.args, perPage, (page - 1) * perPage);
  res.render('admin/leads', { title: 'Khách tư vấn', leads, q, total, page, pages: Math.max(1, Math.ceil(total / perPage)), leadServiceOptions });
});

router.post('/leads/:id(\\d+)', csrf, (req, res) => {
  const status = LEAD_STATUSES[req.body.status] ? req.body.status : 'new';
  const r = db.prepare('UPDATE leads SET status = ?, admin_note = ? WHERE id = ?').run(status, qs(req.body.admin_note, 2000), req.params.id);
  if (req.get('x-requested-with') === 'fetch') return res.status(r.changes ? 200 : 404).json({ ok: Boolean(r.changes) });
  flash(req, r.changes ? 'success' : 'error', r.changes ? 'Đã cập nhật khách hàng.' : 'Không tìm thấy khách hàng.');
  res.redirect('/admin/leads');
});

router.post('/leads/:id(\\d+)/delete', csrf, (req, res) => {
  const r = db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
  flash(req, r.changes ? 'success' : 'error', r.changes ? 'Đã xoá khách hàng.' : 'Không tìm thấy khách hàng.');
  res.redirect('/admin/leads');
});

const csvCell = (v) => {
  let s = String(v == null ? '' : v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // chống CSV injection khi mở bằng Excel
  return `"${s.replace(/"/g, '""')}"`;
};
const sendCsv = (res, filename, header, rows) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n'));
};

router.get('/leads.csv', (req, res) => {
  const f = leadFilter(leadQuery(req.query));
  const rows = db.prepare(`SELECT * FROM leads ${f.sql} ORDER BY id DESC`).all(...f.args);
  sendCsv(res, `trip-khach-tu-van-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Thời gian', 'Họ tên', 'SĐT', 'Dịch vụ', 'Ghi chú khách', 'Trạng thái', 'Ghi chú nội bộ', 'Trang nguồn'],
    rows.map((l) => [fmtDate(l.created_at, true), l.name, l.phone, l.service, l.note, LEAD_STATUSES[l.status], l.admin_note, l.source_page]));
});

// ---------- Người đăng ký nhận tin ----------
router.get('/subscribers', csrf, (req, res) => {
  const q = qs(req.query.q);
  const rows = q
    ? db.prepare('SELECT * FROM subscribers WHERE email LIKE ? OR name LIKE ? ORDER BY id DESC').all(`%${q}%`, `%${q}%`)
    : db.prepare('SELECT * FROM subscribers ORDER BY id DESC').all();
  res.render('admin/subscribers', { title: 'Đăng ký nhận tin', subscribers: rows, q });
});

router.post('/subscribers/:id(\\d+)/delete', csrf, (req, res) => {
  const r = db.prepare('DELETE FROM subscribers WHERE id = ?').run(req.params.id);
  flash(req, r.changes ? 'success' : 'error', r.changes ? 'Đã xoá email khỏi danh sách.' : 'Không tìm thấy email.');
  res.redirect('/admin/subscribers');
});

router.get('/subscribers.csv', (req, res) => {
  const rows = db.prepare('SELECT * FROM subscribers ORDER BY id DESC').all();
  sendCsv(res, `trip-dang-ky-nhan-tin-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Thời gian', 'Email', 'Tên', 'Trạng thái', 'Trang nguồn'],
    rows.map((s) => [fmtDate(s.created_at, true), s.email, s.name, s.status === 'active' ? 'Đang nhận' : 'Đã huỷ', s.source_page]));
});

// ---------- Bản tin tháng (gửi theo đợt, vừa hạn mức Gmail) ----------
const pendingRecipients = (newsletterId) => db.prepare(`SELECT email, token FROM subscribers s WHERE status = 'active'
  AND NOT EXISTS (SELECT 1 FROM newsletter_sends ns WHERE ns.newsletter_id = ? AND ns.email = s.email) ORDER BY id`).all(newsletterId);

const newsletterTours = (ids) => (ids.length
  ? db.prepare(`SELECT * FROM tours WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids)
    .map((t) => ({ title: t.title, duration: t.duration, departure: t.departure, price: t.price, url: `${config.siteUrl}/tour/${t.slug}`, image: t.image ? (t.image.startsWith('http') ? t.image : config.siteUrl + t.image) : '' }))
  : []);

async function sendBatch(newsletter) {
  const recipients = pendingRecipients(newsletter.id);
  if (!recipients.length) return { ok: true, sentNow: 0, remaining: 0 };
  let data = {};
  try { data = JSON.parse(newsletter.result || '{}') || {}; } catch { /* bản tin cũ lưu dạng chữ */ }
  // Apps Script tự dừng sau ~4,5 phút; chờ lâu hơn một chút
  const r = await google.callScript('newsletter', { subject: newsletter.subject, body: newsletter.body, tours: data.tours || [], recipients }, 330000);
  const sent = Array.isArray(r.sent) ? r.sent.filter((e) => typeof e === 'string') : [];
  const ins = db.prepare('INSERT OR IGNORE INTO newsletter_sends (newsletter_id, email) VALUES (?, ?)');
  for (const email of sent) ins.run(newsletter.id, email);
  return { ok: r.ok, error: r.error, sentNow: sent.length, remaining: pendingRecipients(newsletter.id).length };
}

router.get('/newsletter', csrf, (req, res) => {
  const tours = db.prepare("SELECT * FROM tours WHERE status = 'published' ORDER BY featured DESC, sort").all();
  const history = db.prepare(`SELECT n.*, (SELECT COUNT(*) FROM newsletter_sends s WHERE s.newsletter_id = n.id) AS sent
    FROM newsletters n ORDER BY id DESC LIMIT 20`).all()
    .map((n) => ({ ...n, remaining: pendingRecipients(n.id).length }));
  const active = db.prepare("SELECT COUNT(*) AS n FROM subscribers WHERE status = 'active'").get().n;
  res.render('admin/newsletter', { title: 'Gửi bản tin tháng', tours, history, active, testEmails: company.notifyEmails });
});

router.post('/newsletter', csrf, ah(async (req, res) => {
  const subject = qs(req.body.subject, 200).trim();
  const body = qs(req.body.body, 20000).trim();
  const tourIds = [].concat(req.body.tours || []).map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 12);
  const testOnly = req.body.mode === 'test';
  if (!subject || !body) { flash(req, 'error', 'Vui lòng nhập tiêu đề và nội dung.'); return res.redirect('/admin/newsletter'); }
  if (!google.isConfigured()) { flash(req, 'error', 'Chưa cấu hình Google Apps Script nên chưa gửi được email.'); return res.redirect('/admin/newsletter'); }
  const tours = newsletterTours(tourIds);

  if (testOnly) {
    const r = await google.callScript('newsletter', { subject, body, tours, recipients: company.notifyEmails.map((email) => ({ email, token: '' })) }, 120000);
    flash(req, r.ok ? 'success' : 'error', r.ok ? `Đã gửi thử tới ${company.notifyEmails.join(', ')}.` : `Gửi thử thất bại: ${r.error}`);
    return res.redirect('/admin/newsletter');
  }
  const active = db.prepare("SELECT COUNT(*) AS n FROM subscribers WHERE status = 'active'").get().n;
  if (!active) { flash(req, 'error', 'Chưa có người đăng ký nào để gửi.'); return res.redirect('/admin/newsletter'); }
  const id = db.prepare('INSERT INTO newsletters (subject, body, recipients, result) VALUES (?, ?, ?, ?)')
    .run(subject, body, active, JSON.stringify({ tours })).lastInsertRowid;
  const r = await sendBatch(db.prepare('SELECT * FROM newsletters WHERE id = ?').get(id));
  flash(req, r.ok ? 'success' : 'error', `Đã gửi ${r.sentNow} email.` + (r.remaining ? ` Còn ${r.remaining} người chưa gửi (giới hạn Gmail) — bấm "Gửi tiếp" vào ngày mai.` : '') + (r.ok ? '' : ` Lỗi: ${r.error}`));
  res.redirect('/admin/newsletter');
}));

router.post('/newsletter/:id(\\d+)/continue', csrf, ah(async (req, res) => {
  const n = db.prepare('SELECT * FROM newsletters WHERE id = ?').get(req.params.id);
  if (!n) { flash(req, 'error', 'Không tìm thấy bản tin.'); return res.redirect('/admin/newsletter'); }
  const r = await sendBatch(n);
  flash(req, r.ok ? 'success' : 'error', `Đã gửi thêm ${r.sentNow} email.` + (r.remaining ? ` Còn ${r.remaining} người.` : ' Đã gửi xong.') + (r.ok ? '' : ` Lỗi: ${r.error}`));
  res.redirect('/admin/newsletter');
}));

// ---------- Blog & Tour ----------
function uniqueSlug(table, base, fallback, id) {
  const root = base || fallback;
  let slug = root;
  for (let i = 2; db.prepare(`SELECT id FROM ${table} WHERE slug = ? AND id != ?`).get(slug, id || 0); i++) slug = `${root}-${i}`;
  return slug;
}

router.get('/posts', csrf, (req, res) => {
  const posts = db.prepare('SELECT * FROM posts ORDER BY COALESCE(published_at, created_at) DESC').all();
  res.render('admin/posts', { title: 'Bài viết', posts });
});

router.get('/posts/new', csrf, (req, res) => res.render('admin/post-form', { title: 'Viết bài mới', post: { status: 'draft' } }));
router.get('/posts/:id(\\d+)', csrf, (req, res, next) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return next();
  res.render('admin/post-form', { title: 'Sửa bài viết', post });
});

router.post(['/posts/new', '/posts/:id(\\d+)'], withUpload('cover_file'), csrf, ah(async (req, res) => {
  const id = req.params.id ? Number(req.params.id) : null;
  if (id && !db.prepare('SELECT id FROM posts WHERE id = ?').get(id)) { flash(req, 'error', 'Không tìm thấy bài viết.'); return res.redirect('/admin/posts'); }
  const b = req.body;
  const title = qs(b.title, 200).trim();
  if (!title) { flash(req, 'error', 'Bài viết cần có tiêu đề.'); return res.redirect(req.originalUrl); }
  const uploaded = await saveImage(req.file);
  if (req.file && !uploaded) { flash(req, 'error', 'Ảnh bìa không hợp lệ. Chỉ nhận ảnh JPG, PNG, WEBP.'); return res.redirect(req.originalUrl); }
  const keepCover = qs(b.cover, 300).trim();
  const cover = uploaded || (b.remove_cover ? null : (/^\/uploads\/[\w.-]+$/.test(keepCover) ? keepCover : null));
  const status = b.status === 'published' ? 'published' : 'draft';
  const fields = [uniqueSlug('posts', slugify(qs(b.slug, 200) || title), 'bai-viet', id), title, qs(b.excerpt, 400), qs(b.content, 2 * 1024 * 1024), cover, qs(b.category, 50).trim(), status];
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
}));

router.post('/posts/:id(\\d+)/delete', csrf, (req, res) => {
  const r = db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  flash(req, r.changes ? 'success' : 'error', r.changes ? 'Đã xoá bài viết.' : 'Không tìm thấy bài viết.');
  res.redirect('/admin/posts');
});

// Upload ảnh chèn vào nội dung bài viết
router.post('/upload', withUpload('file'), csrf, ah(async (req, res) => {
  const url = await saveImage(req.file);
  if (!url) return res.status(400).json({ ok: false, error: 'Chỉ nhận ảnh JPG, PNG, WEBP tối đa 8MB.' });
  res.json({ ok: true, url });
}));

const TOUR_REGIONS = { 'quoc-te': 'Nước ngoài', 'trong-nuoc': 'Trong nước', 'trong-ngay': 'Trong ngày' };
router.use((req, res, next) => { res.locals.TOUR_REGIONS = TOUR_REGIONS; next(); });

router.get('/tours', csrf, (req, res) => {
  res.render('admin/tours', { title: 'Tour', tours: db.prepare('SELECT * FROM tours ORDER BY featured DESC, sort, id').all() });
});
router.get('/tours/new', csrf, (req, res) => res.render('admin/tour-form', { title: 'Thêm tour', tour: { status: 'published', region: 'quoc-te', departure: 'Đà Nẵng' } }));
router.get('/tours/:id(\\d+)', csrf, (req, res, next) => {
  const tour = db.prepare('SELECT * FROM tours WHERE id = ?').get(req.params.id);
  if (!tour) return next();
  res.render('admin/tour-form', { title: 'Sửa tour', tour });
});

router.post(['/tours/new', '/tours/:id(\\d+)'], withUpload('image_file'), csrf, ah(async (req, res) => {
  const id = req.params.id ? Number(req.params.id) : null;
  if (id && !db.prepare('SELECT id FROM tours WHERE id = ?').get(id)) { flash(req, 'error', 'Không tìm thấy tour.'); return res.redirect('/admin/tours'); }
  const b = req.body;
  const title = qs(b.title, 200).trim();
  if (!title) { flash(req, 'error', 'Tour cần có tên.'); return res.redirect(req.originalUrl); }
  const uploaded = await saveImage(req.file);
  if (req.file && !uploaded) { flash(req, 'error', 'Ảnh tour không hợp lệ. Chỉ nhận ảnh JPG, PNG, WEBP.'); return res.redirect(req.originalUrl); }
  const price = qs(b.price, 20).replace(/\D/g, '');
  const keepImage = qs(b.image, 300).trim();
  const image = uploaded || (b.remove_image ? null : (/^\/(uploads|img)\/[\w./-]+$/.test(keepImage) ? keepImage : null));
  const fields = [
    uniqueSlug('tours', slugify(qs(b.slug, 200) || title), 'tour', id), title, qs(b.destination, 100),
    TOUR_REGIONS[b.region] ? b.region : 'quoc-te', qs(b.duration, 50), qs(b.departure, 100),
    price ? Math.min(Number(price), 1e10) : null, image, qs(b.highlights, 2000), qs(b.itinerary, 200000),
    b.status === 'hidden' ? 'hidden' : 'published', b.featured ? 1 : 0, Math.max(-9999, Math.min(9999, parseInt(qs(b.sort, 6), 10) || 0)),
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
}));

router.post('/tours/:id(\\d+)/delete', csrf, (req, res) => {
  const r = db.prepare('DELETE FROM tours WHERE id = ?').run(req.params.id);
  flash(req, r.changes ? 'success' : 'error', r.changes ? 'Đã xoá tour.' : 'Không tìm thấy tour.');
  res.redirect('/admin/tours');
});

// ---------- Đánh giá của khách ----------
const REVIEW_SOURCES = { zalo: 'Zalo', facebook: 'Facebook', google: 'Google', 'truc-tiep': 'Trực tiếp tại văn phòng', web: 'Khách gửi qua website' };
const REVIEW_STATUSES = { pending: 'Chờ duyệt', published: 'Đang hiển thị', hidden: 'Ẩn' };

router.get('/reviews', csrf, (req, res) => {
  const status = REVIEW_STATUSES[qs(req.query.status, 20)] ? qs(req.query.status, 20) : '';
  const reviews = status
    ? db.prepare('SELECT * FROM reviews WHERE status = ? ORDER BY id DESC').all(status)
    : db.prepare("SELECT * FROM reviews ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, id DESC").all();
  res.render('admin/reviews', { title: 'Đánh giá', reviews, status, REVIEW_SOURCES, REVIEW_STATUSES, leadServiceOptions });
});

// Nhân viên nhập lại đánh giá thật của khách (từ tin nhắn Zalo/Facebook, Google...)
router.post('/reviews', csrf, (req, res) => {
  const b = req.body;
  const name = qs(b.name, 60).trim();
  const content = qs(b.content, 1200).trim();
  const rating = Math.round(Number(qs(b.rating, 1)));
  const source = REVIEW_SOURCES[b.source] && b.source !== 'web' ? b.source : 'zalo';
  if (name.length < 2 || content.length < 10 || !(rating >= 1 && rating <= 5) || !b.confirm_real) {
    flash(req, 'error', 'Vui lòng nhập tên, nội dung, số sao và xác nhận đây là đánh giá thật của khách.');
    return res.redirect('/admin/reviews');
  }
  const service = leadServiceOptions.includes(b.service) ? b.service : '';
  db.prepare("INSERT INTO reviews (name, service, rating, content, source, status) VALUES (?, ?, ?, ?, ?, 'published')").run(name, service, rating, content, source);
  flash(req, 'success', 'Đã thêm và hiển thị đánh giá.');
  res.redirect('/admin/reviews');
});

router.post('/reviews/:id(\\d+)/status', csrf, (req, res) => {
  const status = REVIEW_STATUSES[req.body.status] ? req.body.status : 'hidden';
  const r = db.prepare('UPDATE reviews SET status = ? WHERE id = ?').run(status, req.params.id);
  flash(req, r.changes ? 'success' : 'error', r.changes ? `Đã chuyển sang "${REVIEW_STATUSES[status]}".` : 'Không tìm thấy đánh giá.');
  res.redirect('/admin/reviews');
});

router.post('/reviews/:id(\\d+)/delete', csrf, (req, res) => {
  const r = db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
  flash(req, r.changes ? 'success' : 'error', r.changes ? 'Đã xoá đánh giá.' : 'Không tìm thấy đánh giá.');
  res.redirect('/admin/reviews');
});

// ---------- Cài đặt ----------
const PHONE_KEYS = ['hotline', 'hotline_translation', 'zalo'];
const URL_KEYS = ['facebook', 'messenger'];

router.get('/settings', csrf, (req, res) => {
  res.render('admin/settings', { title: 'Cài đặt website', s: getSettings(), parseVideo, notifyEmails: company.notifyEmails });
});

router.post('/settings', csrf, (req, res) => {
  const update = {}; const warnings = [];
  for (const k of PHONE_KEYS) update[k] = qs(req.body[k], 20).replace(/[^\d+]/g, '');
  for (const k of URL_KEYS) {
    const v = qs(req.body[k], 300).trim();
    if (v && !/^https:\/\/[^\s"'<>]+$/.test(v)) warnings.push(`Link ${k} phải bắt đầu bằng https://`);
    update[k] = /^https:\/\/[^\s"'<>]+$/.test(v) ? v : '';
  }
  const email = qs(req.body.email, 200).trim();
  update.email = /^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/i.test(email) ? email : getSettings().email;
  for (const k of ['hero_video', 'hero_teaser']) {
    const v = qs(req.body[k], 300).trim();
    if (v && !parseVideo(v)) warnings.push(`Link video (${k}) không hợp lệ`);
    update[k] = v && parseVideo(v) ? v : '';
  }
  update.popup_newsletter_delay = String(Math.min(120, Math.max(3, parseInt(qs(req.body.popup_newsletter_delay, 4), 10) || 15)));
  update.popup_newsletter_enabled = req.body.popup_newsletter_enabled ? '1' : '0';
  setSettings(update);
  flash(req, warnings.length ? 'error' : 'success', warnings.length ? `Đã lưu, nhưng: ${warnings.join('; ')}.` : 'Đã lưu cài đặt.');
  res.redirect('/admin/settings');
});

// Gửi lại các bản ghi chưa đồng bộ Google Sheet (Apps Script tự bỏ qua dòng đã có nên không bị trùng)
router.post('/sync', csrf, ah(async (req, res) => {
  if (!google.isConfigured()) { flash(req, 'error', 'Chưa cấu hình Google Apps Script.'); return res.redirect('/admin'); }
  let ok = 0; let fail = 0;
  for (const l of db.prepare('SELECT * FROM leads WHERE sheet_synced = 0 ORDER BY id LIMIT 20').all()) ((await google.syncLead(l, true)).ok ? ok++ : fail++);
  for (const s of db.prepare('SELECT * FROM subscribers WHERE sheet_synced = 0 ORDER BY id LIMIT 20').all()) ((await google.syncSubscriber(s, true)).ok ? ok++ : fail++);
  flash(req, fail ? 'error' : 'success', `Đồng bộ Google Sheet: ${ok} thành công${fail ? `, ${fail} lỗi` : ''}.`);
  res.redirect('/admin');
}));

router.post('/test-google', csrf, ah(async (req, res) => {
  const r = await google.callScript('ping', {});
  flash(req, r.ok ? 'success' : 'error', r.ok
    ? `Kết nối Google thành công. Sheet: ${r.sheetUrl || ''} · Hạn mức Gmail còn hôm nay: ${r.mailQuota ?? '?'}`
    : `Kết nối Google thất bại: ${r.error}`);
  res.redirect('/admin/settings');
}));

// ---------- Tài khoản ----------
router.get('/account', csrf, (req, res) => {
  res.render('admin/account', { title: 'Tài khoản', users: db.prepare('SELECT id, username, created_at FROM users ORDER BY id').all() });
});

router.post('/account/password', csrf, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const current = qs(req.body.current, 200); const password = qs(req.body.password, 200); const confirm = qs(req.body.confirm, 200);
  if (!bcrypt.compareSync(current, user.password_hash)) flash(req, 'error', 'Mật khẩu hiện tại không đúng.');
  else if (password.length < 8) flash(req, 'error', 'Mật khẩu mới cần tối thiểu 8 ký tự.');
  else if (password !== confirm) flash(req, 'error', 'Xác nhận mật khẩu không khớp.');
  else {
    // Đổi mật khẩu thì đăng xuất mọi thiết bị khác, giữ phiên hiện tại
    db.prepare('UPDATE users SET password_hash = ?, session_version = session_version + 1 WHERE id = ?').run(bcrypt.hashSync(password, 10), user.id);
    req.session.sv = user.session_version + 1;
    req.session.iat = Date.now();
    flash(req, 'success', 'Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất.');
  }
  res.redirect('/admin/account');
});

router.post('/account/users', csrf, (req, res) => {
  const username = qs(req.body.username, 60).trim().toLowerCase();
  const password = qs(req.body.password, 200);
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) flash(req, 'error', 'Tên đăng nhập 3–30 ký tự, chỉ gồm chữ thường, số, dấu . _ -');
  else if (password.length < 8) flash(req, 'error', 'Mật khẩu tối thiểu 8 ký tự.');
  else if (db.prepare('SELECT id FROM users WHERE username = ?').get(username)) flash(req, 'error', 'Tên đăng nhập đã tồn tại.');
  else {
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, bcrypt.hashSync(password, 10));
    flash(req, 'success', `Đã tạo tài khoản ${username}.`);
  }
  res.redirect('/admin/account');
});

router.post('/account/users/:id(\\d+)/delete', csrf, (req, res) => {
  if (Number(req.params.id) === req.user.id) flash(req, 'error', 'Không thể xoá tài khoản đang đăng nhập.');
  else {
    const r = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    flash(req, r.changes ? 'success' : 'error', r.changes ? 'Đã xoá tài khoản (phiên đăng nhập của tài khoản đó cũng hết hiệu lực).' : 'Không tìm thấy tài khoản.');
  }
  res.redirect('/admin/account');
});

module.exports = router;
