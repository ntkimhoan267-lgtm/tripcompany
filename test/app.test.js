// Kiểm thử tích hợp: form tư vấn, đăng ký nhận tin, đồng bộ Google (giả lập), dashboard.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'trip-test-'));
const received = [];
let mock; let server; let base;

before(async () => {
  // Giả lập Google Apps Script
  mock = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const data = JSON.parse(body);
      received.push(data);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data.secret === 's3cret' ? { ok: true, sent: (data.data.recipients || []).length, sheetUrl: 'https://sheet' } : { ok: false, error: 'bad secret' }));
    });
  }).listen(0);
  process.env.DATA_DIR = tmp;
  process.env.ADMIN_USERNAME = 'admin';
  process.env.ADMIN_PASSWORD = 'matkhau123';
  process.env.GOOGLE_SCRIPT_URL = `http://127.0.0.1:${mock.address().port}/exec`;
  process.env.GOOGLE_SCRIPT_SECRET = 's3cret';
  const app = require('../server');
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => { server.close(); mock.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const postJson = (url, body) => fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('các trang công khai hiển thị', async () => {
  for (const p of ['/', '/gioi-thieu', '/dich-vu/visa', '/dich-vu/dich-thuat', '/dich-vu/thue-xe', '/bang-gia', '/tour', '/blog', '/lien-he', '/sitemap.xml']) {
    const r = await fetch(base + p);
    assert.equal(r.status, 200, p);
  }
  assert.equal((await fetch(base + '/khong-ton-tai')).status, 404);
});

test('trang web không lộ giá đại lý (Net)', async () => {
  const html = await (await fetch(base + '/bang-gia')).text();
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
  assert.deepEqual(call.notifyEmails, ['ntkimhoan267@gmail.com', 'triptranslate.com@gmail.com']);
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
  assert.equal(call.data.tours[0].url.endsWith('/tour/tour-bac-kinh-7n6d'), true);
});
