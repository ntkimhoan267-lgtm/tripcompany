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

const publishedReviews = (n) => db.prepare("SELECT * FROM reviews WHERE status = 'published' ORDER BY id DESC LIMIT ?").all(n);

const publishedTours = (where = '', ...args) =>
  db.prepare(`SELECT * FROM tours WHERE status = 'published' ${where} ORDER BY featured DESC, sort, id`).all(...args);

router.get('/', (req, res) => {
  res.render('pages/home', {
    meta: {
      title: 'TRIP – Visa Trung Quốc, Hàn Quốc, Nhật Bản, Châu Âu & Dịch thuật công chứng tại Đà Nẵng',
      description: 'TRIP Đà Nẵng chuyên visa Trung Quốc, Hàn Quốc, Nhật Bản và Châu Âu (Schengen, Anh); cùng Mỹ, Úc, Canada; dịch thuật công chứng Anh – Trung – Hàn – Nhật; vé máy bay, tour, thuê xe. Tư vấn miễn phí.',
    },
    services,
    tours: publishedTours('AND featured = 1').slice(0, 4),
    reviews: publishedReviews(6),
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

// ----- Visa: trang tổng quan + mỗi thị trường một trang riêng -----
const VISA_EXTRA = {
  'nuoc-khac': {
    id: 'nuoc-khac', country: 'Mỹ · Úc · Canada & nước khác', short: 'Mỹ, Úc, Canada & nước khác', code: 'us',
    leadService: 'Visa Mỹ / Úc / Canada', from: { usd: 70 }, time: '2–5 tuần',
    blurb: 'Hoa Kỳ, Canada, Úc, New Zealand, Đài Loan, Hồng Kông, Macau, Ấn Độ, Dubai…',
  },
  'e-visa': {
    id: 'e-visa', country: 'E-visa Việt Nam', short: 'E-visa Việt Nam', code: 'vn',
    leadService: 'E-visa Việt Nam (người nước ngoài)', from: { usd: 40 }, time: 'Từ 2 giờ',
    blurb: 'Dành cho người nước ngoài nhập cảnh Việt Nam, kèm Fast Track tại sân bay.',
  },
};
const visaPageOf = (slug) => services.markets.find((m) => m.id === slug) || (Object.hasOwn(VISA_EXTRA, slug) ? VISA_EXTRA[slug] : null);

router.get('/dich-vu/visa', (req, res) => res.redirect(301, '/visa'));

router.get('/visa', (req, res) => {
  res.render('pages/visa-index', {
    meta: { title: 'Visa Trung Quốc, Hàn Quốc, Nhật Bản & Châu Âu trọn gói', description: 'Dịch vụ visa du lịch trọn gói tại TRIP Đà Nẵng: Trung Quốc từ 2.800.000đ, Hàn Quốc từ 120 USD, Nhật Bản từ 3.800.000đ, Schengen từ 220 USD. Luyện phỏng vấn 1 kèm 1.' },
    services, extras: Object.values(VISA_EXTRA),
  });
});

router.get('/visa/:slug', (req, res, next) => {
  const page = visaPageOf(req.params.slug);
  if (!page) return next();
  const others = [...services.markets, ...Object.values(VISA_EXTRA)].filter((m) => m.id !== page.id);
  res.render('pages/visa-market', {
    meta: {
      title: page.id === 'e-visa' ? 'E-visa Việt Nam cho người nước ngoài' : `Visa ${page.country} trọn gói`,
      description: `${page.blurb} Giá trọn gói từ ${require('../lib/helpers').money(page.from)}. Tư vấn miễn phí tại TRIP Đà Nẵng.`,
      image: page.art ? `/img/visa/${page.art}.jpg` : undefined,
    },
    services, page, others,
  });
});

router.get('/dich-vu/dich-thuat', (req, res) => {
  res.render('pages/service-translation', {
    meta: { title: 'Dịch thuật công chứng Anh – Trung – Hàn – Nhật tại Đà Nẵng', description: 'Dịch thuật từ 40.000đ/trang, công chứng dấu công ty hoặc dấu tư pháp. Hợp pháp hoá, chứng nhận lãnh sự. Có gói dịch hoả tốc tại TRIP Đà Nẵng.' },
    services,
  });
});

router.get('/dich-vu/hop-phap-hoa-lanh-su', (req, res) => {
  res.render('pages/legalization', {
    meta: { title: 'Hợp pháp hoá & Chứng nhận lãnh sự', description: 'Chứng nhận lãnh sự, hợp pháp hoá lãnh sự giấy tờ dân sự, học thuật, kinh tế trọn gói tại TRIP Đà Nẵng.' },
    services,
  });
});

router.get('/dich-vu/:slug', (req, res, next) => {
  const svc = Object.hasOwn(services.otherServices, req.params.slug) ? services.otherServices[req.params.slug] : null;
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
  const loai = typeof req.query.loai === 'string' ? req.query.loai : '';
  const region = Object.prototype.hasOwnProperty.call(regions, loai) ? loai : '';
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
  const page = Math.min(1000, Math.max(1, parseInt(typeof req.query.page === 'string' ? req.query.page : '', 10) || 1));
  const category = typeof req.query.chu_de === 'string' ? req.query.chu_de.slice(0, 50) : '';
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

router.get('/danh-gia', (req, res) => {
  const reviews = publishedReviews(60);
  const agg = db.prepare("SELECT COUNT(*) AS n, AVG(rating) AS avg FROM reviews WHERE status = 'published'").get();
  const avg = agg.avg || 0;
  const total = agg.n;
  res.render('pages/reviews', {
    meta: { title: 'Đánh giá của khách hàng về TRIP', description: 'Khách hàng nói gì về dịch vụ visa, dịch thuật và du lịch của TRIP Đà Nẵng. Chia sẻ trải nghiệm của bạn.' },
    reviews, avg, total,
  });
});

router.get('/lien-he', (req, res) => {
  res.render('pages/contact', {
    meta: { title: 'Liên hệ TRIP', description: `Văn phòng TRIP: ${company.address}. Hotline visa & tour, dịch thuật. Tư vấn miễn phí.` },
  });
});

// Huỷ nhận tin: GET chỉ hiện nút xác nhận (trình quét link trong email không tự huỷ hộ), POST mới thực hiện
const subByToken = (t) => (typeof t === 'string' && /^[a-f0-9]{32}$/.test(t) ? db.prepare('SELECT * FROM subscribers WHERE token = ?').get(t) : null);

router.get('/huy-dang-ky', (req, res) => {
  const sub = subByToken(req.query.token);
  res.render('pages/unsubscribe', { meta: { title: 'Huỷ nhận bản tin', robots: 'noindex' }, sub, done: false, token: sub ? sub.token : '' });
});

router.post('/huy-dang-ky', express.urlencoded({ extended: false }), (req, res) => {
  const sub = subByToken(req.body.token);
  if (sub) db.prepare("UPDATE subscribers SET status = 'unsubscribed' WHERE id = ?").run(sub.id);
  res.render('pages/unsubscribe', { meta: { title: 'Huỷ nhận bản tin', robots: 'noindex' }, sub, done: true, token: '' });
});

router.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nDisallow: /admin\nDisallow: /api\nSitemap: ${res.locals.siteUrl}/sitemap.xml\n`);
});

router.get('/sitemap.xml', (req, res) => {
  const base = res.locals.siteUrl;
  const urls = ['/', '/gioi-thieu', '/dich-vu', '/visa',
    ...services.markets.map((m) => `/visa/${m.id}`), ...Object.keys(VISA_EXTRA).map((k) => `/visa/${k}`),
    '/dich-vu/dich-thuat', '/dich-vu/hop-phap-hoa-lanh-su',
    ...Object.keys(services.otherServices).map((s) => `/dich-vu/${s}`),
    '/bang-gia', '/tour', '/blog', '/danh-gia', '/lien-he'];
  for (const t of publishedTours()) urls.push(`/tour/${t.slug}`);
  for (const p of db.prepare("SELECT slug FROM posts WHERE status = 'published'").all()) urls.push(`/blog/${p.slug}`);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${base}${u}</loc></url>`).join('\n')}\n</urlset>`;
  res.type('application/xml').send(xml);
});

module.exports = router;
