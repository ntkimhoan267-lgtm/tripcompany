const express = require('express');
const { marked } = require('marked');
const sanitizeHtml = require('sanitize-html');
const db = require('../db');
// Giá & dữ liệu dịch vụ cho giao diện lấy từ res.locals.services (catalog: mặc định + phần đã sửa trong Dashboard).
// services ở đây chỉ dùng cho đường dẫn / danh sách trang (không đổi theo Dashboard).
const services = require('../data/services');
const { getServices } = require('../lib/catalog');
const company = require('../data/company');

const router = express.Router();
const { buildToc, parseFaq, wordCount, LAYOUTS } = require('../lib/toc');
const config = require('../config');
// Bài viết đang hiển thị: đã xuất bản và tới giờ đăng (bài hẹn giờ chưa tới giờ thì chưa hiện)
const LIVE = "status = 'published' AND published_at IS NOT NULL AND published_at <= datetime('now')";
// '2026-11-09 03:00:00' (UTC, SQLite) -> ISO 8601 cho schema / Open Graph
const isoOf = (d) => (d ? new Date(String(d).replace(' ', 'T') + 'Z').toISOString() : undefined);

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
      title: 'TRIP – Visa & Dịch thuật công chứng tại Đà Nẵng',
      description: 'Visa Trung Quốc, Hàn Quốc, Nhật Bản, Châu Âu trọn gói và dịch thuật công chứng Anh – Trung – Hàn – Nhật tại Đà Nẵng. Tư vấn miễn phí.',
    },
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
const visaPageOf = (slug) => getServices().markets.find((m) => m.id === slug) || (Object.hasOwn(VISA_EXTRA, slug) ? VISA_EXTRA[slug] : null);

router.get('/dich-vu/visa', (req, res) => res.redirect(301, '/visa'));

router.get('/visa', (req, res) => {
  res.render('pages/visa-index', {
    meta: { title: 'Visa Trung Quốc, Hàn Quốc, Nhật Bản & Châu Âu trọn gói', description: 'Dịch vụ visa du lịch trọn gói tại TRIP Đà Nẵng: Trung Quốc từ 2.800.000đ, Hàn Quốc từ $120, Nhật Bản từ 3.800.000đ, Schengen từ 220 USD. Luyện phỏng vấn 1 kèm 1.' },
    extras: Object.values(VISA_EXTRA),
  });
});

router.get('/visa/:slug', (req, res, next) => {
  const page = visaPageOf(req.params.slug);
  if (!page) return next();
  const others = [...getServices().markets, ...Object.values(VISA_EXTRA)].filter((m) => m.id !== page.id);
  res.render('pages/visa-market', {
    meta: {
      title: page.id === 'e-visa' ? 'E-visa Việt Nam cho người nước ngoài' : `Visa ${page.country} trọn gói`,
      description: `${page.blurb} Giá trọn gói từ ${require('../lib/helpers').money(page.from)}. Tư vấn miễn phí tại TRIP Đà Nẵng.`,
      image: page.art ? `/img/visa/${page.art}.jpg` : undefined,
    },
    page, others,
  });
});

router.get('/dich-vu/dich-thuat', (req, res) => {
  res.render('pages/service-translation', {
    meta: { title: 'Dịch thuật công chứng Anh – Trung – Hàn – Nhật', description: 'Dịch thuật từ 40.000đ/trang, công chứng dấu công ty hoặc dấu tư pháp. Hợp pháp hoá, chứng nhận lãnh sự. Có gói dịch hoả tốc tại TRIP Đà Nẵng.' },
  });
});

router.get('/dich-vu/hop-phap-hoa-lanh-su', (req, res) => {
  res.render('pages/legalization', {
    meta: { title: 'Hợp pháp hoá & Chứng nhận lãnh sự', description: 'Chứng nhận lãnh sự, hợp pháp hoá lãnh sự giấy tờ dân sự, học thuật, kinh tế trọn gói tại TRIP Đà Nẵng.' },
  });
});

router.get('/dich-vu/:slug', (req, res, next) => {
  const all = getServices().otherServices;
  const svc = Object.hasOwn(all, req.params.slug) ? all[req.params.slug] : null;
  if (!svc) return next();
  res.render('pages/service-generic', {
    meta: { title: svc.title, description: svc.intro.length > 160 ? svc.intro.slice(0, svc.intro.lastIndexOf(' ', 155)) + '…' : svc.intro },
    svc,
    tours: svc.slug === 'tour' ? publishedTours().slice(0, 6) : [],
  });
});

router.get('/bang-gia', (req, res) => {
  res.render('pages/pricing', {
    meta: { title: 'Bảng giá dịch vụ TRIP', description: 'Bảng giá công khai, trọn gói tại TRIP Đà Nẵng: visa Trung Quốc và các nước, dịch thuật công chứng, hộ chiếu, E-visa Việt Nam, xe đưa đón.' },
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
    meta: { title: tour.title, description: `${tour.title}${tour.duration && !tour.title.includes(tour.duration) && tour.duration !== 'Theo lịch' ? ' – ' + tour.duration : ''}, khởi hành từ ${tour.departure}. Liên hệ TRIP Đà Nẵng để nhận lịch khởi hành và giá chi tiết.`, image: tour.image },
    tour,
    itineraryHtml: renderMarkdown(tour.itinerary),
    related: publishedTours('AND id != ?', tour.id).slice(0, 3),
  });
});

router.get('/blog', (req, res) => {
  const perPage = 9;
  const page = Math.min(1000, Math.max(1, parseInt(typeof req.query.page === 'string' ? req.query.page : '', 10) || 1));
  const category = typeof req.query.chu_de === 'string' ? req.query.chu_de.slice(0, 50) : '';
  const where = category ? `${LIVE} AND category = ?` : LIVE;
  const args = category ? [category] : [];
  const total = db.prepare(`SELECT COUNT(*) AS n FROM posts WHERE ${where}`).get(...args).n;
  const posts = db.prepare(`SELECT * FROM posts WHERE ${where} ORDER BY published_at DESC LIMIT ? OFFSET ?`).all(...args, perPage, (page - 1) * perPage);
  const categories = db.prepare(`SELECT category, COUNT(*) AS n FROM posts WHERE ${LIVE} AND category IS NOT NULL AND category != '' GROUP BY category`).all();
  res.render('pages/blog', {
    meta: { title: 'Cẩm nang Visa, Dịch thuật & Du lịch', description: 'Kinh nghiệm xin visa Trung Quốc, Hàn Quốc, Nhật Bản, Mỹ; dịch thuật công chứng và du lịch, chia sẻ từ đội ngũ tư vấn TRIP Đà Nẵng.' },
    posts, page, pages: Math.max(1, Math.ceil(total / perPage)), category, categories,
  });
});

router.get('/blog/:slug', (req, res, next) => {
  const post = db.prepare(`SELECT * FROM posts WHERE slug = ? AND ${LIVE}`).get(req.params.slug);
  if (!post) {
    // Đường dẫn cũ của bài đã đổi slug -> chuyển hướng 301 sang đường dẫn mới
    const moved = db.prepare(`SELECT p.slug FROM post_redirects r JOIN posts p ON p.id = r.post_id WHERE r.old_slug = ? AND ${LIVE.replace(/status|published_at/g, (c) => 'p.' + c)}`).get(req.params.slug);
    if (moved && moved.slug !== req.params.slug) return res.redirect(301, '/blog/' + encodeURIComponent(moved.slug));
    return next();
  }
  const { html, toc } = buildToc(renderMarkdown(post.content));
  const faq = parseFaq(post.faq).map((f) => ({ q: f.q, a: f.a, html: renderMarkdown(f.a) }));
  const layout = Object.hasOwn(LAYOUTS, post.layout) ? post.layout : 'classic';
  const url = `${config.siteUrl}/blog/${post.slug}`;
  const image = post.cover ? (post.cover.startsWith('http') ? post.cover : config.siteUrl + post.cover) : `${config.siteUrl}/img/og-image.jpg`;
  const description = post.meta_desc || post.excerpt || '';
  const author = post.author || 'Đội ngũ TRIP';
  const jsonld = [{
    '@context': 'https://schema.org', '@type': 'BlogPosting',
    headline: post.title.slice(0, 110), description, image: [image],
    datePublished: isoOf(post.published_at), dateModified: isoOf(post.updated_at > post.published_at ? post.updated_at : post.published_at),
    author: { '@type': post.author ? 'Person' : 'Organization', name: author, url: `${config.siteUrl}/gioi-thieu` },
    publisher: { '@type': 'Organization', name: 'TRIP Đà Nẵng', logo: { '@type': 'ImageObject', url: `${config.siteUrl}/img/logo-icon.png` } },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    articleSection: post.category || undefined, keywords: post.focus_kw || undefined, wordCount: wordCount(post.content), inLanguage: 'vi-VN',
  }];
  // Bố cục Tạp chí / Tối giản không dùng page-hero (nơi in sẵn BreadcrumbList) -> thêm ở đây
  if (layout === 'magazine' || layout === 'minimal') {
    jsonld.push({
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [['Trang chủ', '/'], ['Cẩm nang', '/blog'], [post.title, `/blog/${post.slug}`]]
        .map(([name, href], i) => ({ '@type': 'ListItem', position: i + 1, name, item: config.siteUrl + href })),
    });
  }
  if (faq.length) {
    jsonld.push({
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    });
  }
  res.render('pages/post', {
    meta: {
      title: post.seo_title || post.title, rawTitle: Boolean(post.seo_title), description, image: post.cover, type: 'article',
      robots: post.noindex ? 'noindex, follow' : undefined,
      published: isoOf(post.published_at), modified: isoOf(post.updated_at), jsonld,
    },
    post, html, toc, faq, layout, author,
    readMinutes: Math.max(1, Math.round(wordCount(post.content) / 220)),
    related: db.prepare(`SELECT * FROM posts WHERE ${LIVE} AND id != ? ORDER BY (category = ?) DESC, published_at DESC LIMIT 3`).all(post.id, post.category || ''),
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
  const entries = urls.map((u) => ({ u }));
  // lastmod: Google dùng để biết trang nào vừa cập nhật (ngày theo UTC, định dạng W3C)
  for (const t of publishedTours()) entries.push({ u: `/tour/${t.slug}`, mod: t.updated_at });
  for (const p of db.prepare(`SELECT slug, updated_at, published_at FROM posts WHERE ${LIVE} AND noindex = 0`).all()) {
    entries.push({ u: `/blog/${encodeURIComponent(p.slug)}`, mod: p.updated_at > p.published_at ? p.updated_at : p.published_at });
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map((e) => `  <url><loc>${base}${e.u}</loc>${e.mod ? `<lastmod>${String(e.mod).slice(0, 10)}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>`;
  res.type('application/xml').send(xml);
});

module.exports = router;
