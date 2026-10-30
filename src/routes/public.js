const express = require('express');
const { marked } = require('marked');
const sanitizeHtml = require('sanitize-html');
const db = require('../db');
const services = require('../data/services');
const company = require('../data/company');

const router = express.Router();

const renderMarkdown = (md) => sanitizeHtml(marked.parse(md || ''), {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2']),
  allowedAttributes: { a: ['href', 'title', 'target', 'rel'], img: ['src', 'alt', 'title', 'loading'] },
});

const publishedTours = (where = '', ...args) =>
  db.prepare(`SELECT * FROM tours WHERE status = 'published' ${where} ORDER BY featured DESC, sort, id`).all(...args);
const latestPosts = (n) =>
  db.prepare("SELECT * FROM posts WHERE status = 'published' ORDER BY published_at DESC LIMIT ?").all(n);

router.get('/', (req, res) => {
  res.render('pages/home', {
    meta: {
      title: 'TRIP – Visa Trung Quốc, Hàn Quốc, Nhật Bản, Châu Âu & Dịch thuật công chứng tại Đà Nẵng',
      description: 'TRIP Đà Nẵng chuyên visa Trung Quốc, Hàn Quốc, Nhật Bản và Châu Âu (Schengen, Anh); cùng Mỹ, Úc, Canada; dịch thuật công chứng Anh – Trung – Hàn – Nhật; vé máy bay, tour, thuê xe. Tư vấn miễn phí.',
    },
    services,
    tours: publishedTours('AND featured = 1').slice(0, 4),
    posts: latestPosts(3),
  });
});

router.get('/gioi-thieu', (req, res) => {
  res.render('pages/about', {
    meta: { title: 'Giới thiệu TRIP', description: `${company.legalName} – đơn vị chuyên visa, dịch thuật công chứng và dịch vụ du lịch trọn gói tại Đà Nẵng.` },
  });
});

router.get('/dich-vu', (req, res) => {
  res.render('pages/services', {
    meta: { title: 'Dịch vụ của TRIP', description: 'Visa, dịch thuật công chứng, hộ chiếu, vé máy bay, tour, thuê xe, bảo hiểm du lịch, eSIM – trọn gói tại TRIP Đà Nẵng.' },
    services,
  });
});

router.get('/dich-vu/visa', (req, res) => {
  res.render('pages/service-visa', {
    meta: { title: 'Visa Trung Quốc, Hàn Quốc, Nhật Bản & Châu Âu trọn gói', description: 'Bảng giá visa trọn gói tại TRIP Đà Nẵng: Trung Quốc từ 2.800.000đ, Hàn Quốc từ 120 USD, Nhật Bản từ 3.800.000đ, Schengen từ 220 USD. Luyện phỏng vấn 1 kèm 1.' },
    services,
  });
});

router.get('/dich-vu/dich-thuat', (req, res) => {
  res.render('pages/service-translation', {
    meta: { title: 'Dịch thuật công chứng Anh – Trung – Hàn – Nhật tại Đà Nẵng', description: 'Dịch thuật công chứng dấu công ty, dấu tư pháp từ 40.000đ/trang. Hợp pháp hoá, chứng nhận lãnh sự. Dịch hoả tốc trong ngày tại TRIP Đà Nẵng.' },
    services,
  });
});

router.get('/dich-vu/:slug', (req, res, next) => {
  const svc = services.otherServices[req.params.slug];
  if (!svc) return next();
  res.render('pages/service-generic', {
    meta: { title: svc.title, description: svc.short },
    svc,
    services,
    tours: svc.slug === 'tour' ? publishedTours().slice(0, 6) : [],
  });
});

router.get('/bang-gia', (req, res) => {
  res.render('pages/pricing', {
    meta: { title: 'Bảng giá dịch vụ TRIP', description: 'Bảng giá công khai: visa các nước, dịch thuật công chứng, hộ chiếu, e-visa Việt Nam, xe đưa đón Đà Nẵng.' },
    services,
  });
});

router.get('/tour', (req, res) => {
  const regions = { 'quoc-te': 'Tour nước ngoài', 'trong-nuoc': 'Tour trong nước', 'trong-ngay': 'Tour trong ngày Đà Nẵng' };
  const region = regions[req.query.loai] ? req.query.loai : '';
  res.render('pages/tours', {
    meta: { title: 'Tour du lịch khởi hành từ Đà Nẵng', description: 'Tour Trung Quốc, Hàn Quốc, Thái Lan, Singapore, Phú Quốc và tour trong ngày Bà Nà, Hội An, Cù Lao Chàm, Huế.' },
    tours: region ? publishedTours('AND region = ?', region) : publishedTours(),
    regions, region,
  });
});

router.get('/tour/:slug', (req, res, next) => {
  const tour = db.prepare("SELECT * FROM tours WHERE slug = ? AND status = 'published'").get(req.params.slug);
  if (!tour) return next();
  res.render('pages/tour-detail', {
    meta: { title: tour.title, description: `${tour.title} – ${tour.duration}, khởi hành từ ${tour.departure}. Liên hệ TRIP để nhận lịch khởi hành và giá tốt nhất.`, image: tour.image },
    tour,
    itineraryHtml: renderMarkdown(tour.itinerary),
    related: publishedTours('AND id != ?', tour.id).slice(0, 3),
  });
});

router.get('/blog', (req, res) => {
  const perPage = 9;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const category = String(req.query.chu_de || '').slice(0, 50);
  const where = category ? "status = 'published' AND category = ?" : "status = 'published'";
  const args = category ? [category] : [];
  const total = db.prepare(`SELECT COUNT(*) AS n FROM posts WHERE ${where}`).get(...args).n;
  const posts = db.prepare(`SELECT * FROM posts WHERE ${where} ORDER BY published_at DESC LIMIT ? OFFSET ?`).all(...args, perPage, (page - 1) * perPage);
  const categories = db.prepare("SELECT category, COUNT(*) AS n FROM posts WHERE status = 'published' AND category IS NOT NULL AND category != '' GROUP BY category").all();
  res.render('pages/blog', {
    meta: { title: 'Cẩm nang Visa, Dịch thuật & Du lịch', description: 'Kinh nghiệm xin visa, dịch thuật công chứng và du lịch từ đội ngũ TRIP Đà Nẵng.' },
    posts, page, pages: Math.max(1, Math.ceil(total / perPage)), category, categories,
  });
});

router.get('/blog/:slug', (req, res, next) => {
  const post = db.prepare("SELECT * FROM posts WHERE slug = ? AND status = 'published'").get(req.params.slug);
  if (!post) return next();
  res.render('pages/post', {
    meta: { title: post.title, description: post.excerpt, image: post.cover, type: 'article' },
    post,
    html: renderMarkdown(post.content),
    related: db.prepare("SELECT * FROM posts WHERE status = 'published' AND id != ? ORDER BY published_at DESC LIMIT 3").all(post.id),
  });
});

router.get('/lien-he', (req, res) => {
  res.render('pages/contact', {
    meta: { title: 'Liên hệ TRIP', description: `Văn phòng TRIP: ${company.address}. Hotline visa & tour, dịch thuật. Tư vấn miễn phí.` },
  });
});

router.get('/huy-dang-ky', (req, res) => {
  const token = String(req.query.token || '');
  const sub = token && db.prepare('SELECT * FROM subscribers WHERE token = ?').get(token);
  if (sub) db.prepare("UPDATE subscribers SET status = 'unsubscribed' WHERE id = ?").run(sub.id);
  res.render('pages/unsubscribe', { meta: { title: 'Huỷ nhận bản tin', robots: 'noindex' }, ok: Boolean(sub) });
});

router.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nDisallow: /admin\nDisallow: /api\nSitemap: ${res.locals.siteUrl}/sitemap.xml\n`);
});

router.get('/sitemap.xml', (req, res) => {
  const base = res.locals.siteUrl;
  const urls = ['/', '/gioi-thieu', '/dich-vu', '/dich-vu/visa', '/dich-vu/dich-thuat',
    ...Object.keys(services.otherServices).map((s) => `/dich-vu/${s}`),
    '/bang-gia', '/tour', '/blog', '/lien-he'];
  for (const t of publishedTours()) urls.push(`/tour/${t.slug}`);
  for (const p of db.prepare("SELECT slug FROM posts WHERE status = 'published'").all()) urls.push(`/blog/${p.slug}`);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${base}${u}</loc></url>`).join('\n')}\n</urlset>`;
  res.type('application/xml').send(xml);
});

module.exports = router;
