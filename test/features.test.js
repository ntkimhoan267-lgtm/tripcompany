// Kiểm thử các tính năng: ưu đãi giảm giá, bảng giá & ảnh/video sửa trong Dashboard, bài viết chuẩn SEO, hộ chiếu làm nhanh
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'trip-feat-'));
let server; let base;

before(() => {
  process.env.DATA_DIR = tmp;
  process.env.ADMIN_USERNAME = 'admin';
  process.env.ADMIN_PASSWORD = 'matkhau123';
  delete process.env.GOOGLE_SCRIPT_URL;
  const app = require('../server');
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

const get = (url, headers = {}) => fetch(base + url, { headers, redirect: 'manual' });
// Website nối từ ghép bằng khoảng trắng không ngắt (U+00A0): đổi về khoảng trắng thường để so khớp dễ đọc
const text = async (url, headers) => (await (await get(url, headers)).text()).replace(/\u00a0/g, ' ');
const postJson = (url, body, ip = '10.1.0.1') => fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip }, body: JSON.stringify(body) });

let cookie = '';
const keepCookie = (r) => { const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(/,(?=\s*trip_sess)/).map((c) => c.split(';')[0].trim()).filter((c) => c.startsWith('trip_sess')).join('; '); };
const getCsrf = async (url) => {
  const r = await fetch(base + url, { headers: { cookie } }); keepCookie(r);
  return (await r.text()).match(/name="_csrf" value="([^"]+)"/)[1];
};
const form = async (url, data) => {
  const r = await fetch(base + url, { method: 'POST', redirect: 'manual', headers: { cookie, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(data) });
  keepCookie(r); return r;
};
const login = async (username = 'admin', password = 'matkhau123') => {
  cookie = '';
  const csrf = await getCsrf('/admin/login');
  const r = await form('/admin/login', { _csrf: csrf, username, password });
  assert.equal(r.status, 302);
};
const adminHtml = async (url) => (await (await fetch(base + url, { headers: { cookie } })).text()).replace(/\u00a0/g, ' ');
const flashOf = (html) => (html.match(/class="flash flash--(\w+)">([^<]*)/) || []).slice(1).join(': ');

// ---------- Ưu đãi ----------
test('bảng giá: giá niêm yết = giá thật + 500.000đ, có nút nhận ưu đãi', async () => {
  const html = await text('/bang-gia');
  assert.match(html, /<span class="op__list"><span class="sr-only">Giá niêm yết <\/span>3\.300\.000đ<\/span><span class="op__deal"><span class="sr-only">, giá ưu đãi <\/span>2\.800\.000đ/);
  assert.match(html, /data-open-offer/);
  assert.match(html, /id="offer-modal"/);
  assert.doesNotMatch(html, /class="no-js offer-on"/);
  // USD: visa Hàn 120 USD -> niêm yết $140
  assert.match(html, /\$140<\/span><span class="op__deal"><span class="sr-only">, giá ưu đãi <\/span>\$120/);
  // dịch thuật (nhóm tắt mặc định): giữ nguyên giá
  assert.match(html, /<strong>40\.000đ<\/strong><small>\/trang/);
});

test('ưu đãi: cookie trip_offer -> trang hiện sẵn giá ưu đãi', async () => {
  const html = await text('/bang-gia', { cookie: 'trip_offer=1' });
  assert.match(html, /class="no-js offer-on"/);
});

test('popup ưu đãi: SĐT -> khách tư vấn, Gmail -> nhận tin, sai -> báo lỗi; đều đặt cookie', async () => {
  const bad = await postJson('/api/offer', { contact: 'abc' });
  assert.equal(bad.status, 400);
  assert.ok((await bad.json()).errors.contact);
  assert.ok(!bad.headers.get('set-cookie'));

  const r1 = await postJson('/api/offer', { contact: '0905 111 222', service: 'Hộ chiếu', source: '/dich-vu/ho-chieu' });
  assert.equal(r1.status, 200);
  assert.match(r1.headers.get('set-cookie'), /trip_offer=1/);
  const r2 = await postJson('/api/offer', { contact: 'Khach.UuDai@gmail.com', name: 'Lan' });
  assert.equal(r2.status, 200);
  assert.match(r2.headers.get('set-cookie'), /trip_offer=1/);

  await login();
  const leads = await adminHtml('/admin/leads');
  assert.match(leads, /0905111222/);
  assert.match(leads, /\[Ưu đãi\]/);
  assert.match(await adminHtml('/admin/subscribers'), /khach\.uudai@gmail\.com/);
});

test('form tư vấn và nhận tin cũng mở giá ưu đãi', async () => {
  const r = await postJson('/api/leads', { name: 'Khách A', phone: '0935 191 394', service: 'Visa Trung Quốc' }, '10.1.0.2');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('set-cookie'), /trip_offer=1/);
  const s = await postJson('/api/subscribe', { email: 'nhan-tin@gmail.com' }, '10.1.0.2');
  assert.match(s.headers.get('set-cookie'), /trip_offer=1/);
});

test('dashboard: tắt ưu đãi -> website hiện giá thật; bật lại cho nhóm khác', async () => {
  await login();
  let csrf = await getCsrf('/admin/prices');
  await form('/admin/offer', { _csrf: csrf, offer_vnd: '500.000', offer_usd: '20' }); // không tick "Bật"
  let html = await text('/bang-gia');
  assert.doesNotMatch(html, /class="op"/);
  assert.match(html, /2\.800\.000đ/);
  assert.doesNotMatch(html, /id="offer-modal"/);

  csrf = await getCsrf('/admin/prices');
  const body = new URLSearchParams({ _csrf: csrf, offer_enabled: '1', offer_vnd: '300000', offer_usd: '10' });
  for (const g of ['cn', 'translation', 'khong-ton-tai']) body.append('groups', g);
  await fetch(base + '/admin/offer', { method: 'POST', redirect: 'manual', headers: { cookie, 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  html = await text('/bang-gia');
  assert.match(html, /3\.100\.000đ<\/span><span class="op__deal">/); // 2.800.000 + 300.000
  assert.match(html, /340\.000đ<\/span><span class="op__deal">/); // dịch thuật 40.000 + 300.000
  assert.doesNotMatch(html, /\$130<\/span>/); // visa các nước không áp dụng

  // khôi phục mặc định cho các test sau
  csrf = await getCsrf('/admin/prices');
  const reset = new URLSearchParams({ _csrf: csrf, offer_enabled: '1', offer_vnd: '500000', offer_usd: '20' });
  for (const g of ['cn', 'world', 'markets', 'passport', 'legal', 'tours']) reset.append('groups', g);
  await fetch(base + '/admin/offer', { method: 'POST', redirect: 'manual', headers: { cookie, 'Content-Type': 'application/x-www-form-urlencoded' }, body: reset });
});

// ---------- Bảng giá sửa trong Dashboard ----------
test('dashboard bảng giá: sửa giá, thêm dòng, chặn dữ liệu sai, khôi phục mặc định', async () => {
  await login();
  const editor = await adminHtml('/admin/prices');
  assert.match(editor, /data-table="cn"/);
  assert.match(editor, /data-table="passport_express"/);

  let csrf = await getCsrf('/admin/prices');
  const cn = [{ type: 'Visa Du lịch <script>alert(1)</script>', detail: 'Lưu trú 15 ngày', time: '10 ngày', price: '2.700.000' }];
  const express = [{ label: 'Lấy trong 1 ngày', time: '1 ngày làm việc', price: '' }, { label: 'Lấy trong 2 ngày', time: '2 ngày', price: '2500000' }];
  let r = await form('/admin/prices', { _csrf: csrf, payload: JSON.stringify({ tables: { cn, passport_express: express }, texts: { passport_notes: 'Ghi chú A\nGhi chú B' } }) });
  assert.equal(r.status, 302);
  let html = await text('/bang-gia');
  assert.match(html, /3\.200\.000đ<\/span><span class="op__deal"><span class="sr-only">, giá ưu đãi <\/span>2\.700\.000đ/);
  assert.ok(!html.includes('<script>alert(1)</script>'), 'tên dịch vụ được escape');
  assert.match(html, /Visa Du lịch &lt;script&gt;/);
  const passport = await text('/dich-vu/ho-chieu');
  assert.equal((passport.match(/class="express__item/g) || []).length, 2);
  assert.match(passport, /Liên hệ tư vấn/);
  assert.match(passport, /3\.000\.000đ<\/span><span class="op__deal">/); // 2.500.000 + 500.000
  assert.match(passport, /Ghi chú B/);

  // thiếu ô bắt buộc -> báo lỗi, bảng đó không đổi
  csrf = await getCsrf('/admin/prices');
  await form('/admin/prices', { _csrf: csrf, payload: JSON.stringify({ tables: { cn: [{ type: '', price: '3000000', detail: 'x' }] } }) });
  assert.match(flashOf(await adminHtml('/admin/prices')), /^error: .*thiếu (&#34;|")Loại visa/);
  assert.match(await text('/bang-gia'), /2\.700\.000đ/);

  // bảng cố định (4 thị trường) không được thêm/bớt dòng
  csrf = await getCsrf('/admin/prices');
  await form('/admin/prices', { _csrf: csrf, payload: JSON.stringify({ tables: { markets: [{ cur: 'vnd', amount: '3000000' }] } }) });
  assert.match(flashOf(await adminHtml('/admin/prices')), /số dòng không được thay đổi/);

  // khôi phục mặc định
  csrf = await getCsrf('/admin/prices');
  const body = new URLSearchParams({ _csrf: csrf, payload: JSON.stringify({ tables: {}, texts: {} }) });
  body.append('reset', 'cn'); body.append('reset', 'passport_express'); body.append('reset', 'passport_notes');
  await fetch(base + '/admin/prices', { method: 'POST', redirect: 'manual', headers: { cookie, 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  html = await text('/bang-gia');
  assert.match(html, /3\.300\.000đ<\/span><span class="op__deal">/);
  assert.equal(((await text('/dich-vu/ho-chieu')).match(/class="express__item/g) || []).length, 7);

  // payload hỏng không làm lỗi máy chủ
  csrf = await getCsrf('/admin/prices');
  r = await form('/admin/prices', { _csrf: csrf, payload: '{hỏng' });
  assert.equal(r.status, 302);
});

test('dashboard bảng giá: giá "từ" của thị trường và visa các nước (USD/VNĐ)', async () => {
  await login();
  const csrf = await getCsrf('/admin/prices');
  const markets = [
    { cur: 'vnd', amount: '2.500.000', time: '7 ngày', blurb: 'Mô tả mới' }, { cur: 'usd', amount: '110', time: '10 ngày', blurb: '' },
    { cur: 'vnd', amount: '3.800.000', time: '7 ngày', blurb: '' }, { cur: 'usd', amount: '220', time: '', blurb: '' },
  ];
  const world = [{ country: 'Hàn Quốc', code: 'kr', region: 'chau-a', type: 'Du lịch 3 tháng', time: '10 ngày', cur: 'usd', amount: '99', note: '' }];
  await form('/admin/prices', { _csrf: csrf, payload: JSON.stringify({ tables: { markets, world } }) });
  const home = await text('/');
  assert.match(home, /3\.000\.000đ<\/span><span class="op__deal"><span class="sr-only">, giá ưu đãi <\/span>2\.500\.000đ/);
  const kr = await text('/visa/han-quoc');
  assert.match(kr, /\$119<\/span><span class="op__deal"><span class="sr-only">, giá ưu đãi <\/span>\$99/);
  const reset = new URLSearchParams({ _csrf: await getCsrf('/admin/prices'), payload: '{"tables":{}}' });
  reset.append('reset', 'markets'); reset.append('reset', 'world');
  await fetch(base + '/admin/prices', { method: 'POST', redirect: 'manual', headers: { cookie, 'Content-Type': 'application/x-www-form-urlencoded' }, body: reset });
  assert.match(await text('/visa/han-quoc'), /\$140<\/span>/);
});

// ---------- Ảnh & video ----------
test('dashboard ảnh & video: đổi ảnh dịch vụ, video nền; chặn đường dẫn nguy hiểm', async () => {
  await login();
  assert.match(await adminHtml('/admin/media'), /media_svc_ho-chieu/);
  const csrf = await getCsrf('/admin/media');
  await form('/admin/media', {
    _csrf: csrf,
    'media_svc_ho-chieu': '/uploads/anh-ho-chieu.webp',
    'media_bg_ho-chieu': '/uploads/nen.mp4', 'media_bg_ho-chieu__poster': '/uploads/nen-poster.webp',
    media_market_cn: 'javascript:alert(1).mp4',
    media_home_team: '/img/../server.js',
  });
  const flash = flashOf(await adminHtml('/admin/media'));
  assert.match(flash, /^error: /);
  const page = await text('/dich-vu/ho-chieu');
  assert.match(page, /\/uploads\/anh-ho-chieu\.webp/);
  assert.match(page, /data-src="\/uploads\/nen\.mp4" poster="\/uploads\/nen-poster\.webp"/);
  const home = await text('/');
  assert.ok(!home.includes('javascript:'), 'không nhận link javascript:');
  assert.match(home, /\/media\/markets\/cn\.mp4/); // giữ mặc định
  assert.match(await text('/dich-vu'), /\/uploads\/anh-ho-chieu\.webp/); // thẻ dịch vụ cũng đổi
});

test('tải video: chỉ nhận MP4/WebM thật', async () => {
  await login();
  const csrf = await getCsrf('/admin/media');
  const send = (buf, name) => {
    const fd = new FormData(); fd.append('_csrf', csrf); fd.append('file', new Blob([buf]), name);
    return fetch(base + '/admin/upload-video', { method: 'POST', headers: { cookie, 'x-requested-with': 'fetch' }, body: fd });
  };
  const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypmp42'), Buffer.alloc(64)]);
  const ok = await send(mp4, 'a.mp4');
  const res = await ok.json();
  assert.equal(res.ok, true);
  assert.match(res.url, /^\/uploads\/[\w-]+\.mp4$/);
  assert.equal((await fetch(base + res.url)).status, 200);
  const bad = await send(Buffer.from('<html><script>alert(1)</script></html>'.padEnd(64)), 'x.mp4');
  assert.equal(bad.status, 400);
});

test('nhân viên không vào được Bảng giá / Ảnh & video', async () => {
  await login();
  const csrf = await getCsrf('/admin/account');
  await form('/admin/account/users', { _csrf: csrf, username: 'nhanvien', password: 'matkhau-nv-123' });
  await login('nhanvien', 'matkhau-nv-123');
  assert.equal((await fetch(base + '/admin/prices', { headers: { cookie } })).status, 403);
  assert.equal((await fetch(base + '/admin/media', { headers: { cookie } })).status, 403);
  const html = await adminHtml('/admin/posts');
  assert.doesNotMatch(html, /href="\/admin\/prices"/);
  await login();
});

// ---------- Bài viết chuẩn SEO ----------
const savePost = async (id, fields) => {
  const csrf = await getCsrf(id ? `/admin/posts/${id}` : '/admin/posts/new');
  const fd = new FormData();
  fd.append('_csrf', csrf);
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  const r = await fetch(base + (id ? `/admin/posts/${id}` : '/admin/posts/new'), { method: 'POST', redirect: 'manual', headers: { cookie }, body: fd });
  assert.equal(r.status, 302);
  return r.headers.get('location');
};

test('bài viết SEO: mục lục, tiêu đề/mô tả Google, schema, FAQ, bố cục', async () => {
  await login();
  const loc = await savePost(null, {
    title: 'Kinh nghiệm xin visa Nhật Bản tự túc', status: 'published', stay: '1', category: 'Visa',
    content: '## Chuẩn bị hồ sơ\nNội dung.\n### Giấy tờ cá nhân\nA\n### Giấy tờ cá nhân\nB\n## 3 bước nộp hồ sơ\nC',
    seo_title: 'Xin visa Nhật Bản tự túc: hồ sơ & kinh nghiệm', meta_desc: 'Mô tả Google cho bài visa Nhật.',
    focus_kw: 'visa nhật bản', cover_alt: 'Ảnh visa', author: 'Chị Nhi', layout: 'magazine', theme: 'accent', toc: '1',
    faq: 'Hỏi: Visa Nhật mất bao lâu?\nĐáp: Khoảng **7 ngày** làm việc.\n\nHỏi: Có cần sổ tiết kiệm?\nĐáp: Tuỳ hồ sơ.',
  });
  assert.match(loc, /^\/admin\/posts\/\d+$/);
  const html = await text('/blog/kinh-nghiem-xin-visa-nhat-ban-tu-tuc');
  assert.match(html, /<title>Xin visa Nhật Bản tự túc: hồ sơ &amp; kinh nghiệm<\/title>/);
  assert.match(html, /<meta name="description" content="Mô tả Google cho bài visa Nhật\.">/);
  assert.match(html, /<h2 id="chuan-bi-ho-so">Chuẩn bị hồ sơ<\/h2>/);
  assert.match(html, /<h3 id="giay-to-ca-nhan-2">/, 'id không trùng');
  assert.match(html, /<h2 id="muc-3-buoc-nop-ho-so">/, 'id không bắt đầu bằng số');
  assert.match(html, /class="toc"/);
  assert.match(html, /href="#giay-to-ca-nhan"><span class="toc__num">1\.1\.<\/span>/);
  assert.match(html, /href="#cau-hoi-thuong-gap"/);
  assert.match(html, /"@type":"BlogPosting"/);
  assert.match(html, /"@type":"FAQPage"/);
  assert.match(html, /"@type":"BreadcrumbList"/);
  assert.match(html, /"name":"Chị Nhi"/);
  assert.match(html, /<strong>7 ngày<\/strong>/);
  assert.match(html, /class="post-cover"/);
  assert.match(html, /post--accent/);
  assert.match(html, /article:published_time/);
});

test('bài viết: đổi đường dẫn -> 301 từ link cũ; noindex; hẹn giờ đăng', async () => {
  await login();
  const loc = await savePost(null, { title: 'Bài đổi slug', status: 'published', stay: '1', content: '## A\n## B' });
  const id = loc.split('/').pop();
  await savePost(id, { title: 'Bài đổi slug', status: 'published', slug: 'duong-dan-moi', content: '## A\n## B', toc: '1' });
  const r = await get('/blog/bai-doi-slug');
  assert.equal(r.status, 301);
  assert.equal(r.headers.get('location'), '/blog/duong-dan-moi');
  assert.equal((await get('/blog/duong-dan-moi')).status, 200);

  await savePost(id, { title: 'Bài đổi slug', status: 'published', slug: 'duong-dan-moi', content: '## A', noindex: '1' });
  assert.match(await text('/blog/duong-dan-moi'), /<meta name="robots" content="noindex, follow">/);
  assert.doesNotMatch(await text('/sitemap.xml'), /duong-dan-moi/);

  // Hẹn giờ: 2 ngày nữa (giờ VN)
  const future = new Date(Date.now() + 7 * 3600e3 + 2 * 86400e3).toISOString().slice(0, 16);
  await savePost(null, { title: 'Bài hẹn giờ', status: 'published', content: 'x', publish_at: future });
  assert.equal((await get('/blog/bai-hen-gio')).status, 404);
  assert.doesNotMatch(await text('/blog'), /Bài hẹn giờ/);
  assert.doesNotMatch(await text('/sitemap.xml'), /bai-hen-gio/);
  assert.match(await adminHtml('/admin/posts'), /Hẹn giờ/);
});

test('bài SEO làm hộ chiếu nhanh có sẵn, trong sitemap; trang hộ chiếu có 7 gói làm nhanh', async () => {
  const html = await text('/blog/lam-ho-chieu-nhanh-khi-sap-bay');
  assert.match(html, /<title>Làm hộ chiếu nhanh khi sắp bay: hết hạn, còn dưới 6 tháng<\/title>/);
  assert.match(html, /class="container post-guide"/);
  assert.match(html, /"@type":"FAQPage"/);
  const sitemap = await text('/sitemap.xml');
  assert.match(sitemap, /lam-ho-chieu-nhanh-khi-sap-bay<\/loc><lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
  const passport = await text('/dich-vu/ho-chieu');
  assert.equal((passport.match(/class="express__item/g) || []).length, 7);
  assert.match(passport, /data-note="Cần làm hộ chiếu nhanh \(cần trong 1 ngày\)/);
  assert.match(passport, /không cam kết thay cơ quan nhà nước/);
  assert.doesNotMatch(passport, /1 ngày làm việc/);
  assert.match(passport, /\/blog\/lam-ho-chieu-nhanh-khi-sap-bay/);
});

// ---------- Lỗi do subagent kiểm tra phát hiện ----------
test('bảng giá: giá gõ sai bị báo lỗi (không lưu thành số sai); hiểu 500k, 2,8tr', async () => {
  await login();
  const save = async (rows) => {
    const csrf = await getCsrf('/admin/prices');
    await form('/admin/prices', { _csrf: csrf, payload: JSON.stringify({ tables: { cn: rows } }) });
    return flashOf(await adminHtml('/admin/prices'));
  };
  for (const bad of ['abc', '-500000', '0', '1,5', '15']) {
    assert.match(await save([{ type: 'Visa A', price: bad }]), /^error: /, `"${bad}" phải bị báo lỗi`);
  }
  assert.match(await text('/bang-gia'), /3\.300\.000đ<\/span><span class="op__deal">/, 'giá cũ giữ nguyên');
  assert.match(await save([{ type: 'Visa A', price: '2,8tr' }, { type: 'Visa B', price: '500k' }]), /^success: /);
  const html = await text('/bang-gia');
  assert.match(html, /3\.300\.000đ<\/span><span class="op__deal"><span class="sr-only">, giá ưu đãi <\/span>2\.800\.000đ/);
  assert.match(html, /1\.000\.000đ<\/span><span class="op__deal"><span class="sr-only">, giá ưu đãi <\/span>500\.000đ/);
  // bảng giá "từ" không được để trống (trang chủ, trang Dịch vụ dùng)
  assert.match(await save([]), /cần ít nhất 1 dòng/);
  for (const u of ['/', '/dich-vu', '/dich-vu/dich-thuat', '/bang-gia']) assert.equal((await get(u)).status, 200, u);
  // khôi phục
  const csrf = await getCsrf('/admin/prices');
  const body = new URLSearchParams({ _csrf: csrf, payload: '{"tables":{}}' }); body.append('reset', 'cn');
  await fetch(base + '/admin/prices', { method: 'POST', redirect: 'manual', headers: { cookie, 'Content-Type': 'application/x-www-form-urlencoded' }, body });
});

test('bảng giá: lưu cả trang mà không đổi gì -> không bảng nào bị đánh dấu "Đã sửa"', async () => {
  await login();
  // Gửi lại đúng giá mặc định của mọi bảng (như khi bấm Lưu mà không sửa gì)
  const { editorData } = require('../src/lib/catalog');
  const data = editorData();
  const tables = {}; const texts = {};
  for (const t of data.tables) tables[t.id] = t.rows.map((r) => Object.fromEntries(t.fields.map((fl) => [fl.k, r[fl.k] == null ? '' : String(r[fl.k])])));
  for (const x of data.texts) texts[x.id] = x.value;
  const csrf = await getCsrf('/admin/prices');
  await form('/admin/prices', { _csrf: csrf, payload: JSON.stringify({ tables, texts }) });
  const html = await adminHtml('/admin/prices');
  assert.match(flashOf(html), /^success: /);
  assert.doesNotMatch(html, /badge--contacting">Đã sửa/);
});

test('bảng giá tràn: ô ảnh sai bị báo lỗi; ảnh & video sai không xoá giá trị cũ', async () => {
  await login();
  let csrf = await getCsrf('/admin/prices');
  await form('/admin/prices', { _csrf: csrf, payload: JSON.stringify({ tables: { selfdrive: [{ car: 'Xe A', seats: '4 chỗ', price: '800000', image: '/uploads/evil.exe' }] } }) });
  assert.match(flashOf(await adminHtml('/admin/prices')), /cần là file ảnh/);
  csrf = await getCsrf('/admin/media');
  await form('/admin/media', { _csrf: csrf, media_home_team: '/uploads/doi-ngu.webp' });
  csrf = await getCsrf('/admin/media');
  await form('/admin/media', { _csrf: csrf, media_home_team: 'https://x.com/a.exe' });
  assert.match(flashOf(await adminHtml('/admin/media')), /đã giữ giá trị cũ/);
  assert.match(await text('/'), /\/uploads\/doi-ngu\.webp/);
  csrf = await getCsrf('/admin/media');
  await form('/admin/media', { _csrf: csrf, media_home_team: '' });
});

test('ưu đãi: email chỉ nhận ưu đãi không vào danh sách gửi bản tin; số điện thoại không tạo khách trùng', async () => {
  await postJson('/api/offer', { contact: 'chi-uu-dai@gmail.com' }, '10.1.0.50');
  await postJson('/api/offer', { contact: 'uu-dai-va-tin@gmail.com', newsletter: '1' }, '10.1.0.50');
  await postJson('/api/offer', { contact: '0912 345 678' }, '10.1.0.51');
  await postJson('/api/offer', { contact: '0912345678' }, '10.1.0.51');
  await login();
  const subs = await adminHtml('/admin/subscribers');
  const row = (email) => (subs.split('<tr>').find((r) => r.includes(email)) || '');
  assert.match(row('chi-uu-dai@gmail.com'), /Chỉ nhận ưu đãi/);
  assert.match(row('uu-dai-va-tin@gmail.com'), /Đang nhận/);
  const leads = await adminHtml('/admin/leads?q=0912345678');
  assert.equal((leads.match(/0912345678/g) || []).length >= 1, true);
  const db = require('../src/db');
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM leads WHERE phone = '0912345678'").get().n, 1);
  // tự đăng ký nhận tin sau đó -> bật nhận tin
  await postJson('/api/subscribe', { email: 'chi-uu-dai@gmail.com' }, '10.1.0.52');
  assert.equal(db.prepare("SELECT status FROM subscribers WHERE email = 'chi-uu-dai@gmail.com'").get().status, 'active');
});

test('bài viết: "# " trong nội dung thành H2 (1 H1/trang); id không trùng khung trang; 1 BreadcrumbList; sai ngày giờ giữ nội dung', async () => {
  await login();
  await savePost(null, { title: 'Bài một H1', status: 'published', content: '# Main\nA\n## Câu hỏi thường gặp\nB', faq: 'Hỏi: X?\nĐáp: **Y** [z](/a)', layout: 'classic', toc: '1' });
  const html = await text('/blog/bai-mot-h1');
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
  assert.match(html, /<h2 id="main-2">Main<\/h2>/);
  assert.match(html, /<h2 id="cau-hoi-thuong-gap-2">/);
  assert.equal((html.match(/"@type":"BreadcrumbList"/g) || []).length, 1);
  assert.match(html, /"text":"Y z"/, 'câu trả lời FAQ trong schema là chữ thuần');
  assert.match(html, /"@type":"Organization","name":"Đội ngũ TRIP"/);

  // ngày giờ không có thật -> báo lỗi, form hiện lại với nội dung vừa gõ
  const csrf = await getCsrf('/admin/posts/new');
  const fd = new FormData();
  fd.append('_csrf', csrf); fd.append('title', 'Bài giữ nội dung'); fd.append('content', 'Nội dung dài đã gõ'); fd.append('status', 'published'); fd.append('publish_at', '2026-13-45T99:99');
  const r = await fetch(base + '/admin/posts/new', { method: 'POST', redirect: 'manual', headers: { cookie }, body: fd });
  assert.equal(r.status, 400);
  const page = (await r.text()).replace(/ /g, ' ');
  assert.match(page, /Ngày giờ đăng không hợp lệ/);
  assert.match(page, /Nội dung dài đã gõ/);

  // ảnh bìa không phải ảnh -> báo lỗi, giữ nội dung
  const csrf2 = await getCsrf('/admin/posts/new');
  const fd2 = new FormData();
  fd2.append('_csrf', csrf2); fd2.append('title', 'Bài ảnh sai'); fd2.append('content', 'Giữ tôi lại'); fd2.append('cover_file', new Blob(['<html></html>'], { type: 'text/html' }), 'a.png');
  const r2 = await fetch(base + '/admin/posts/new', { method: 'POST', redirect: 'manual', headers: { cookie }, body: fd2 });
  assert.equal(r2.status, 400);
  assert.match(await r2.text(), /Giữ tôi lại/);
});

test('bài viết hẹn giờ: xoá ô ngày giờ đăng -> đăng ngay', async () => {
  await login();
  const future = new Date(Date.now() + 7 * 3600e3 + 3 * 86400e3).toISOString().slice(0, 16);
  const loc = await savePost(null, { title: 'Bài hẹn rồi đăng ngay', status: 'published', stay: '1', content: 'x', publish_at: future });
  assert.equal((await get('/blog/bai-hen-roi-dang-ngay')).status, 404);
  await savePost(loc.split('/').pop(), { title: 'Bài hẹn rồi đăng ngay', status: 'published', content: 'x', publish_at: '' });
  assert.equal((await get('/blog/bai-hen-roi-dang-ngay')).status, 200);
});

test('mô tả Google và giá "từ" theo bảng giá hiện tại; đường dẫn chuẩn không có "/" cuối', async () => {
  const visa = await text('/visa');
  assert.match(visa, /<meta name="description" content="[^"]*Trung Quốc từ 3\.300\.000đ, Hàn Quốc từ \$140/);
  assert.match(await text('/visa/nuoc-khac'), /<meta name="description" content="[^"]*Giá trọn gói từ \$90\./);
  // E-visa không bật ưu đãi mặc định: giữ giá thật
  assert.match(await text('/visa/e-visa'), /<meta name="description" content="[^"]*Giá trọn gói từ \$40\./);
  assert.match(await text('/blog/lam-ho-chieu-nhanh-khi-sap-bay/'), /<link rel="canonical" href="https:\/\/tripdn\.com\/blog\/lam-ho-chieu-nhanh-khi-sap-bay">/);
});
