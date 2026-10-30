// Kiểm thử tích hợp: form tư vấn, đăng ký nhận tin, đồng bộ Google (giả lập), dashboard.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'trip-test-'));
const crypto = require('node:crypto');
const received = [];
let mockMode = 'ok';
let mock; let server; let base;

before(async () => {
  // Giả lập Google Apps Script
  mock = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      if (mockMode === 'null') return res.end('null');
      const { payload, sig } = JSON.parse(body);
      const expected = crypto.createHmac('sha256', 's3cret-0123456789-0123456789-abcdef').update(payload).digest('hex');
      if (sig !== expected) return res.end(JSON.stringify({ ok: false, error: 'bad sig' }));
      const data = JSON.parse(payload);
      received.push(data);
      const recips = (data.data.recipients || []).map((r) => r.email);
      res.end(JSON.stringify({ ok: true, sent: recips, sheetUrl: 'https://sheet' }));
    });
  }).listen(0);
  process.env.DATA_DIR = tmp;
  process.env.ADMIN_USERNAME = 'admin';
  process.env.ADMIN_PASSWORD = 'matkhau123';
  process.env.GOOGLE_SCRIPT_URL = `http://127.0.0.1:${mock.address().port}/exec`;
  process.env.GOOGLE_SCRIPT_SECRET = 's3cret-0123456789-0123456789-abcdef';
  const app = require('../server');
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => { server.close(); mock.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const postJson = (url, body) => fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('các trang công khai hiển thị', async () => {
  for (const p of ['/', '/gioi-thieu', '/visa', '/visa/trung-quoc', '/visa/han-quoc', '/visa/nhat-ban', '/visa/chau-au', '/visa/nuoc-khac', '/visa/e-visa', '/dich-vu/dich-thuat', '/dich-vu/hop-phap-hoa-lanh-su', '/dich-vu/thue-xe', '/bang-gia', '/tour', '/blog', '/lien-he', '/sitemap.xml']) {
    const r = await fetch(base + p);
    assert.equal(r.status, 200, p);
  }
  assert.equal((await fetch(base + '/khong-ton-tai')).status, 404);
  assert.equal((await fetch(base + '/visa/khong-co')).status, 404);
  const old = await fetch(base + '/dich-vu/visa', { redirect: 'manual' });
  assert.equal(old.status, 301);
  assert.equal(old.headers.get('location'), '/visa');
});

test('trang web không lộ giá đại lý (Net)', async () => {
  let html = '';
  for (const p of ['/bang-gia', '/visa/trung-quoc', '/visa/nhat-ban', '/visa/chau-au', '/visa/nuoc-khac', '/dich-vu/dich-thuat']) html += await (await fetch(base + p)).text();
  // Các mức giá chỉ có ở cột Giá Đại Lý (Net) trong bảng báo giá nội bộ
  for (const net of ['2.600.000', '7.600.000', '2.990.000', '5.770.000', '$241', '$370', '35.000đ']) assert.ok(!html.includes(net), `lộ giá net ${net}`);
});

test('form tư vấn: kiểm tra dữ liệu', async () => {
  const r = await postJson('/api/leads', { name: '', phone: '123', service: 'abc' });
  assert.equal(r.status, 400);
  const j = await r.json();
  assert.ok(j.errors.name && j.errors.phone && j.errors.service);
});

test('form tư vấn: lưu và gửi sang Google Sheet', async () => {
  const r = await postJson('/api/leads', { name: 'Nguyễn Văn A', phone: '0935 191 394', service: 'Visa Trung Quốc', note: 'Đi tháng 12', source: '/' });
  assert.equal(r.status, 200);
  assert.ok((await r.json()).ok);
  await wait(200);
  const call = received.find((x) => x.action === 'lead');
  assert.ok(call, 'đã gọi Apps Script');
  assert.equal(call.data.phone, '0935191394');
  assert.equal(call.notifyEmails, undefined, 'website không được tự chọn email nhận thông báo');
  assert.ok(Math.abs(Date.now() - call.ts) < 10000, 'có dấu thời gian');
});

test('honeypot chặn bot', async () => {
  const before = received.length;
  const r = await postJson('/api/leads', { name: 'Bot', phone: '0935191394', service: 'Khác', website: 'spam.com' });
  assert.ok((await r.json()).ok);
  await wait(100);
  assert.equal(received.length, before);
});

test('đăng ký nhận tin + trùng email + huỷ đăng ký', async () => {
  const r1 = await postJson('/api/subscribe', { email: 'Khach@Gmail.com', name: 'Khách' });
  assert.ok((await r1.json()).ok);
  const r2 = await postJson('/api/subscribe', { email: 'khach@gmail.com' });
  assert.match((await r2.json()).message, /đã có/);
  const bad = await postJson('/api/subscribe', { email: 'abc' });
  assert.equal(bad.status, 400);
  await wait(200);
  assert.ok(received.some((x) => x.action === 'subscribe' && x.data.email === 'khach@gmail.com'));
});

test('chặn request từ website khác', async () => {
  const r = await fetch(base + '/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' }, body: '{}' });
  assert.equal(r.status, 403);
});

// --- Dashboard ---
let cookie = '';
const getCsrf = async (url) => {
  const r = await fetch(base + url, { headers: { cookie } });
  const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(/,(?=\s*trip_sess)/).map((c) => c.split(';')[0]).join('; ');
  const html = await r.text();
  return html.match(/name="_csrf" value="([^"]+)"/)[1];
};
const form = async (url, data) => {
  const r = await fetch(base + url, { method: 'POST', redirect: 'manual', headers: { cookie, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(data) });
  const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(/,(?=\s*trip_sess)/).map((c) => c.split(';')[0]).join('; ');
  return r;
};

test('dashboard yêu cầu đăng nhập', async () => {
  const r = await fetch(base + '/admin/leads', { redirect: 'manual' });
  assert.equal(r.status, 302);
  assert.match(r.headers.get('location'), /\/admin\/login/);
});

test('đăng nhập sai / đúng', async () => {
  let csrf = await getCsrf('/admin/login');
  assert.equal((await form('/admin/login', { _csrf: csrf, username: 'admin', password: 'sai' })).status, 401);
  csrf = await getCsrf('/admin/login');
  const ok = await form('/admin/login', { _csrf: csrf, username: 'admin', password: 'matkhau123' });
  assert.equal(ok.status, 302);
  assert.equal(ok.headers.get('location'), '/admin');
});

test('form admin không có CSRF bị chặn', async () => {
  const r = await form('/admin/settings', { hotline: '000' });
  assert.equal(r.status, 403);
});

test('dashboard: xem khách, đổi trạng thái, xuất CSV', async () => {
  const html = await (await fetch(base + '/admin', { headers: { cookie } })).text();
  assert.match(html, /Nguyễn Văn A/);
  const csrf = await getCsrf('/admin/leads');
  const r = await form('/admin/leads/1', { _csrf: csrf, status: 'won', admin_note: 'Đã cọc' });
  assert.equal(r.status, 302);
  const csv = await (await fetch(base + '/admin/leads.csv', { headers: { cookie } })).text();
  assert.match(csv, /Đã chốt/);
  assert.match(csv, /Đã cọc/);
});

test('dashboard: viết bài và tour hiển thị ra website', async () => {
  let csrf = await getCsrf('/admin/posts/new');
  const fd = new FormData();
  fd.append('_csrf', csrf); fd.append('title', 'Bài kiểm thử Visa Hàn'); fd.append('content', '## Xin chào\n<script>alert(1)</script>'); fd.append('status', 'published');
  const r = await fetch(base + '/admin/posts/new', { method: 'POST', redirect: 'manual', headers: { cookie }, body: fd });
  assert.equal(r.status, 302);
  const page = await (await fetch(base + '/blog/bai-kiem-thu-visa-han')).text();
  assert.match(page, /<h2>Xin chào<\/h2>/);
  assert.ok(!page.includes('<script>alert(1)</script>'), 'đã lọc script');

  csrf = await getCsrf('/admin/tours/new');
  const fd2 = new FormData();
  fd2.append('_csrf', csrf); fd2.append('title', 'Tour Thượng Hải 5N4Đ'); fd2.append('price', '12.990.000'); fd2.append('region', 'quoc-te'); fd2.append('status', 'published');
  await fetch(base + '/admin/tours/new', { method: 'POST', redirect: 'manual', headers: { cookie }, body: fd2 });
  const tour = await (await fetch(base + '/tour/tour-thuong-hai-5n4d')).text();
  assert.match(tour, /12\.990\.000đ/);
});

test('gửi bản tin qua Apps Script', async () => {
  const csrf = await getCsrf('/admin/newsletter');
  const r = await form('/admin/newsletter', { _csrf: csrf, subject: 'Tour tháng 12', body: 'Xin chào', mode: 'all', tours: '1' });
  assert.equal(r.status, 302);
  const call = received.find((x) => x.action === 'newsletter');
  assert.equal(call.data.recipients.length, 1);
  const page = await (await fetch(base + '/admin/newsletter', { headers: { cookie } })).text();
  assert.match(page, /1 người/);
  assert.equal(call.data.tours[0].url.endsWith('/tour/tour-bac-kinh-7n6d'), true);
});

test('API: Origin null và dữ liệu dạng mảng không gây lỗi 500', async () => {
  const r1 = await fetch(base + '/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'null' }, body: '{}' });
  assert.equal(r1.status, 403);
  const r2 = await postJson('/api/leads', { name: ['a', 'b'], phone: { x: 1 }, service: [] });
  assert.equal(r2.status, 400);
  const r3 = await fetch(base + '/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad json' });
  assert.equal(r3.status, 400);
  assert.equal((await fetch(base + '/tour?loai[toString]=x')).status, 200);
  assert.equal((await fetch(base + '/blog?page=99999999999999999999')).status, 200);
});

test('admin: query dạng mảng, id không phải số', async () => {
  assert.equal((await fetch(base + '/admin/leads?status[]=new&page=9e99', { headers: { cookie } })).status, 200);
  const csrf = await getCsrf('/admin/posts');
  const before = (await (await fetch(base + '/admin/posts', { headers: { cookie } })).text()).match(/\/admin\/posts\/\d+"/g).length;
  const r = await form('/admin/posts/abc', { _csrf: csrf, title: 'X' });
  assert.equal(r.status, 404);
  const after = (await (await fetch(base + '/admin/posts', { headers: { cookie } })).text()).match(/\/admin\/posts\/\d+"/g).length;
  assert.equal(after, before, 'không tạo bài mới');
});

test('upload: chặn file giả ảnh, ảnh thật được mã hoá lại thành webp', async () => {
  const csrf = await getCsrf('/admin/posts/new');
  const fake = new FormData();
  fake.append('_csrf', csrf);
  fake.append('file', new Blob(['<script>alert(1)</script>'], { type: 'image/png' }), 'x.html');
  const r1 = await fetch(base + '/admin/upload', { method: 'POST', headers: { cookie }, body: fake });
  assert.equal(r1.status, 400);
  const png = await require('sharp')({ create: { width: 4, height: 4, channels: 3, background: '#5ba4d4' } }).png().toBuffer();
  const good = new FormData();
  good.append('_csrf', csrf);
  good.append('file', new Blob([png], { type: 'image/png' }), 'a.js');
  const r2 = await fetch(base + '/admin/upload', { method: 'POST', headers: { cookie }, body: good });
  const j = await r2.json();
  assert.match(j.url, /^\/uploads\/[\w-]+\.webp$/);
  const img = await fetch(base + j.url);
  assert.equal(img.headers.get('content-type'), 'image/webp');
  assert.match(img.headers.get('content-security-policy'), /sandbox/);
});

test('đồng bộ khi Google trả về dữ liệu lạ không làm sập server', async () => {
  mockMode = 'null';
  await postJson('/api/leads', { name: 'Khách B', phone: '0905123456', service: 'Visa Nhật Bản' });
  await wait(200);
  const csrf = await getCsrf('/admin');
  const r = await form('/admin/sync', { _csrf: csrf });
  assert.equal(r.status, 302);
  assert.equal((await fetch(base + '/')).status, 200);
  mockMode = 'ok';
});

test('huỷ nhận tin cần bấm xác nhận', async () => {
  const db = require('../src/db');
  const sub = db.prepare('SELECT * FROM subscribers LIMIT 1').get();
  await fetch(base + '/huy-dang-ky?token=' + sub.token);
  assert.equal(db.prepare('SELECT status FROM subscribers WHERE id = ?').get(sub.id).status, 'active', 'GET không tự huỷ');
  await fetch(base + '/huy-dang-ky', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'token=' + sub.token });
  assert.equal(db.prepare('SELECT status FROM subscribers WHERE id = ?').get(sub.id).status, 'unsubscribed');
});

test('phiên đăng nhập bị thu hồi khi đăng xuất / xoá tài khoản', async () => {
  // tạo nhân viên, đăng nhập bằng nhân viên đó
  let csrf = await getCsrf('/admin/account');
  await form('/admin/account/users', { _csrf: csrf, username: 'nhanvien', password: 'matkhau456' });
  const adminCookie = cookie;
  cookie = '';
  csrf = await getCsrf('/admin/login');
  await form('/admin/login', { _csrf: csrf, username: 'nhanvien', password: 'matkhau456' });
  const staffCookie = cookie;
  assert.equal((await fetch(base + '/admin', { headers: { cookie: staffCookie }, redirect: 'manual' })).status, 200);
  // admin xoá nhân viên -> cookie của nhân viên hết hiệu lực
  cookie = adminCookie;
  const page = await (await fetch(base + '/admin/account', { headers: { cookie } })).text();
  const id = page.match(/\/admin\/account\/users\/(\d+)\/delete/)[1];
  csrf = await getCsrf('/admin/account');
  await form(`/admin/account/users/${id}/delete`, { _csrf: csrf });
  assert.equal((await fetch(base + '/admin', { headers: { cookie: staffCookie }, redirect: 'manual' })).status, 302);
  // đăng xuất -> cookie cũ (đã sao chép) không dùng lại được
  const copied = cookie;
  csrf = await getCsrf('/admin');
  await form('/admin/logout', { _csrf: csrf });
  assert.equal((await fetch(base + '/admin', { headers: { cookie: copied }, redirect: 'manual' })).status, 302);
});
