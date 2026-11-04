// Kiểm thử các bản sửa sau đợt kiểm tra toàn bộ website (mục 1–10).
// Chạy server riêng + Apps Script giả lập có thể chậm / lỗi / mất kết nối / chỉ gửi được một phần.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const net = require('node:net');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn, execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const SECRET = 'hardening-secret-0123456789-abcdefgh';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'trip-hard-'));
const mock = { mode: 'ok', delay: 0, calls: [] };
let mockServer; let server; let base; let mockUrl;

before(async () => {
  mockServer = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const { payload, sig } = JSON.parse(body);
      const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
      const call = JSON.parse(payload);
      if (sig !== expected) { res.end(JSON.stringify({ ok: false, error: 'bad sig' })); return; }
      mock.calls.push(call);
      const respond = () => {
        if (res.destroyed) return;
        res.setHeader('Content-Type', 'application/json');
        if (mock.mode === 'down') { res.statusCode = 502; return res.end('Bad gateway'); }
        if (mock.mode === 'fail') return res.end(JSON.stringify({ ok: false, error: 'boom' }));
        const recips = (call.data.recipients || []).map((r) => r.email);
        if (mock.mode === 'partial') return res.end(JSON.stringify({ ok: true, sent: recips.slice(0, 1), remaining: recips.length - 1 }));
        res.end(JSON.stringify({ ok: true, sent: recips, sheetUrl: 'https://sheet', mailQuota: 99 }));
      };
      if (mock.delay) setTimeout(respond, mock.delay); else respond();
    });
  }).listen(0);
  mockUrl = `http://127.0.0.1:${mockServer.address().port}/exec`;
  Object.assign(process.env, {
    DATA_DIR: tmp, ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: 'matkhau123',
    GOOGLE_SCRIPT_URL: mockUrl, GOOGLE_SCRIPT_SECRET: SECRET, SYNC_TIMEOUT_MS: '300',
  });
  const app = require('../server');
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); mockServer.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// Trang công khai được nối từ ghép bằng khoảng trắng không ngắt (U+00A0): đổi về khoảng trắng thường để so sánh
const txt = (s) => s.replace(/\u00a0/g, ' ');
const callsOf = (action) => mock.calls.filter((c) => c.action === action);
const db = () => require('../src/db');

// Trình duyệt giả có cookie riêng (đăng nhập nhiều tài khoản / nhiều server cùng lúc)
class Client {
  constructor(url) { this.url = url; this.jar = new Map(); }
  store(r) { for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); this.jar.set(kv.slice(0, i), kv.slice(i + 1)); } return r; }
  get cookie() { return [...this.jar].map(([k, v]) => `${k}=${v}`).join('; '); }
  async get(p, headers = {}) { return this.store(await fetch(this.url + p, { redirect: 'manual', headers: { cookie: this.cookie, ...headers } })); }
  async csrf(p) { const html = await (await this.get(p)).text(); return html.match(/name="_csrf" value="([^"]+)"/)[1]; }
  async form(p, data, headers = {}) {
    return this.store(await fetch(this.url + p, { method: 'POST', redirect: 'manual', headers: { cookie: this.cookie, 'Content-Type': 'application/x-www-form-urlencoded', ...headers }, body: new URLSearchParams(data) }));
  }
  async login(username, password, ip = '10.200.0.1') {
    const csrf = await this.csrf('/admin/login');
    return this.form('/admin/login', { _csrf: csrf, username, password }, { 'X-Forwarded-For': ip });
  }
}
let admin;
const flashOf = async (c, p) => (await (await c.get(p)).text());

before(async () => {
  admin = new Client(base);
  assert.equal((await admin.login('admin', 'matkhau123')).status, 302);
});

// ---------------------------------------------------------------- 1. Bản tin gửi trùng
function addSubscribers(emails) {
  const ins = db().prepare("INSERT INTO subscribers (email, name, token, created_at) VALUES (?, '', ?, datetime('now', '-1 minute'))");
  for (const e of emails) ins.run(e, crypto.randomBytes(8).toString('hex'));
}
async function newNewsletter(subject) {
  const csrf = await admin.csrf('/admin/newsletter');
  return admin.form('/admin/newsletter', { _csrf: csrf, subject, body: 'Nội dung', mode: 'all' });
}
const sendsOf = (subject) => db().prepare(`SELECT s.email, s.status FROM newsletter_sends s JOIN newsletters n ON n.id = s.newsletter_id WHERE n.subject = ?`).all(subject);

test('1. bản tin: bấm gửi 2 lần cùng lúc chỉ gửi 1 đợt; ghi "đang gửi" trước khi gọi Apps Script', async () => {
  addSubscribers(['a1@gmail.com', 'a2@gmail.com', 'a3@gmail.com']);
  mock.mode = 'ok'; mock.delay = 600;
  const before = callsOf('newsletter').length;
  const csrf = await admin.csrf('/admin/newsletter');
  const send = () => admin.form('/admin/newsletter', { _csrf: csrf, subject: 'Bấm hai lần', body: 'x', mode: 'all' });
  const p1 = send(); await wait(150); const p2 = send();
  await wait(150);
  // Đang chờ Apps Script: cả 3 người nhận đã được ghi 'sending'
  assert.deepEqual(sendsOf('Bấm hai lần').map((r) => r.status), ['sending', 'sending', 'sending']);
  await Promise.all([p1, p2]);
  mock.delay = 0;
  assert.equal(callsOf('newsletter').length - before, 1, 'chỉ gọi Apps Script 1 lần');
  assert.equal(db().prepare("SELECT COUNT(*) AS n FROM newsletters WHERE subject = 'Bấm hai lần'").get().n, 1, 'không tạo bản tin thứ hai');
  assert.ok(sendsOf('Bấm hai lần').every((r) => r.status === 'sent'));
});

test('1. bản tin: mode lạ (mảng / thiếu) không bị hiểu thành "gửi tất cả"', async () => {
  const before = callsOf('newsletter').length;
  const csrf = await admin.csrf('/admin/newsletter');
  const body = new URLSearchParams([['_csrf', csrf], ['subject', 'Mode lạ'], ['body', 'x'], ['mode', 'test'], ['mode', 'all']]);
  await admin.store(await fetch(base + '/admin/newsletter', { method: 'POST', redirect: 'manual', headers: { cookie: admin.cookie, 'Content-Type': 'application/x-www-form-urlencoded' }, body }));
  await admin.form('/admin/newsletter', { _csrf: csrf, subject: 'Mode thiếu', body: 'x' });
  assert.equal(callsOf('newsletter').length, before);
});

test('1. bản tin: mất kết nối Google -> người nhận "chưa rõ", bấm "Gửi tiếp" không gửi lại', async () => {
  mock.mode = 'down';
  await newNewsletter('Mất kết nối');
  mock.mode = 'ok';
  assert.ok(sendsOf('Mất kết nối').length >= 3 && sendsOf('Mất kết nối').every((r) => r.status === 'sending'));
  const id = db().prepare("SELECT id FROM newsletters WHERE subject = 'Mất kết nối'").get().id;
  const before = callsOf('newsletter').length;
  const csrf = await admin.csrf('/admin/newsletter');
  await admin.form(`/admin/newsletter/${id}/continue`, { _csrf: csrf });
  assert.equal(callsOf('newsletter').length, before, 'không gửi lại cho người có thể đã nhận');
  assert.match(await flashOf(admin, '/admin/newsletter'), /chưa rõ \d/);
});

test('1. bản tin: Apps Script gửi được một phần -> phần còn lại được "Gửi tiếp", không trùng', async () => {
  mock.mode = 'partial';
  await newNewsletter('Gửi một phần');
  mock.mode = 'ok';
  const rows = sendsOf('Gửi một phần');
  assert.equal(rows.length, 1); assert.equal(rows[0].status, 'sent');
  const id = db().prepare("SELECT id FROM newsletters WHERE subject = 'Gửi một phần'").get().id;
  const csrf = await admin.csrf('/admin/newsletter');
  await admin.form(`/admin/newsletter/${id}/continue`, { _csrf: csrf });
  const last = callsOf('newsletter').at(-1);
  assert.ok(!last.data.recipients.some((r) => r.email === rows[0].email), 'không gửi lại cho người đã nhận');
  assert.ok(sendsOf('Gửi một phần').every((r) => r.status === 'sent'));
});

test('1. bản tin: Apps Script trả lời lỗi (vd sai mã bí mật) -> người nhận không bị kẹt "chưa rõ", gửi tiếp được', async () => {
  mock.mode = 'fail';
  await newNewsletter('Apps Script báo lỗi');
  mock.mode = 'ok';
  assert.equal(sendsOf('Apps Script báo lỗi').length, 0, 'không ai bị giữ ở trạng thái "đang gửi"');
  const id = db().prepare("SELECT id FROM newsletters WHERE subject = 'Apps Script báo lỗi'").get().id;
  const csrf = await admin.csrf('/admin/newsletter');
  await admin.form(`/admin/newsletter/${id}/continue`, { _csrf: csrf });
  assert.ok(sendsOf('Apps Script báo lỗi').length >= 3 && sendsOf('Apps Script báo lỗi').every((r) => r.status === 'sent'));
});

test('1. bản tin: mỗi đợt chỉ đánh dấu tối đa 60 người; "Cho phép gửi lại" trả người "chưa rõ" về danh sách chờ', async () => {
  addSubscribers(Array.from({ length: 70 }, (_, i) => `nhieu${i}@gmail.com`));
  mock.mode = 'down';
  await newNewsletter('Đợt lớn');
  mock.mode = 'ok';
  const rows = sendsOf('Đợt lớn');
  assert.equal(rows.length, 60, 'chỉ 60 người của đợt bị "chưa rõ", số còn lại vẫn chờ gửi');
  const id = db().prepare("SELECT id FROM newsletters WHERE subject = 'Đợt lớn'").get().id;
  const csrf = await admin.csrf('/admin/newsletter');
  await admin.form(`/admin/newsletter/${id}/release`, { _csrf: csrf });
  assert.equal(sendsOf('Đợt lớn').length, 0);
  await admin.form(`/admin/newsletter/${id}/continue`, { _csrf: csrf });
  assert.equal(callsOf('newsletter').at(-1).data.recipients.length, 60);
});

async function freePort() {
  return new Promise((resolve) => { const s = net.createServer().listen(0, () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
}
test('1. SIGTERM: chờ request đang chạy xong rồi mới tắt (exit 0)', async () => {
  const port = await freePort();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trip-sigterm-'));
  const child = spawn(process.execPath, ['--no-warnings', 'server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), DATA_DIR: dir, SHUTDOWN_GRACE_MS: '8000', NODE_ENV: 'development' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  child.stdout.on('data', (d) => { out += d; }); child.stderr.on('data', (d) => { out += d; });
  const exited = new Promise((resolve) => child.on('exit', (code) => resolve(code)));
  try {
    for (let i = 0; i < 100 && !/đang chạy/.test(out); i++) await wait(100);
    assert.match(out, /đang chạy/);
    const c = new Client(`http://127.0.0.1:${port}`);
    assert.equal((await c.login('admin', 'matkhau123')).status, 302);
    const csrf = await c.csrf('/admin/settings');
    mock.mode = 'ok'; mock.delay = 1500;
    const t0 = Date.now();
    const inflight = c.form('/admin/test-google', { _csrf: csrf }); // gọi Apps Script mất 1,5 giây
    await wait(400);
    child.kill('SIGTERM');
    const r = await inflight;
    assert.equal(r.status, 302, 'request đang chạy vẫn hoàn tất');
    assert.ok(Date.now() - t0 >= 1400);
    assert.equal(await exited, 0, 'tắt gọn với mã 0');
    assert.match(out, /Đang tắt/);
  } finally {
    mock.delay = 0;
    if (child.exitCode === null) child.kill('SIGKILL');
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------- 2. Sao lưu
const yauzl = require('yauzl');
const readZip = (buf) => new Promise((resolve, reject) => {
  yauzl.fromBuffer(buf, { lazyEntries: true }, (err, zip) => {
    if (err) return reject(err);
    const files = {};
    zip.on('entry', (e) => zip.openReadStream(e, (e2, s) => {
      if (e2) return reject(e2);
      const chunks = []; s.on('data', (c) => chunks.push(c)); s.on('end', () => { files[e.fileName] = Buffer.concat(chunks); zip.readEntry(); });
    }));
    zip.on('end', () => resolve(files)); zip.readEntry();
  });
});
let uploadedImage = '';
async function uploadPng(width = 6, height = 6) {
  const png = await require('sharp')({ create: { width, height, channels: 3, background: '#5ba4d4' } }).png().toBuffer();
  const csrf = await admin.csrf('/admin/posts/new');
  const fd = new FormData(); fd.append('_csrf', csrf); fd.append('file', new Blob([png], { type: 'image/png' }), 'a.png');
  return (await fetch(base + '/admin/upload', { method: 'POST', headers: { cookie: admin.cookie }, body: fd })).json();
}

test('2. sao lưu: zip gồm trip.db + uploads/, không có mật khẩu; khôi phục + đặt lại mật khẩu được', async () => {
  // Ảnh đang được dùng trong một tour
  uploadedImage = (await uploadPng()).url;
  const csrf = await admin.csrf('/admin/tours/new');
  await admin.form('/admin/tours/new', { _csrf: csrf, title: 'Tour có ảnh tải lên', image: uploadedImage, region: 'quoc-te' });

  const r = await admin.get('/admin/backup');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'application/zip');
  const buf = Buffer.from(await r.arrayBuffer());
  const files = await readZip(buf);
  assert.ok(files['trip.db'], 'có trip.db');
  assert.ok(files[`uploads/${path.basename(uploadedImage)}`], 'có ảnh tải lên');
  // Không còn hash mật khẩu (kể cả sót trong trang trống của file)
  const realHash = db().prepare("SELECT password_hash FROM users WHERE username = 'admin'").get().password_hash;
  assert.ok(!files['trip.db'].includes(Buffer.from(realHash)), 'hash mật khẩu không có trong file');
  const restoreDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trip-restore-'));
  try {
    const zipFile = path.join(restoreDir, 'backup.zip');
    fs.writeFileSync(zipFile, buf);
    const env = { ...process.env, DATA_DIR: restoreDir, NODE_ENV: 'development' };
    execFileSync(process.execPath, ['--no-warnings', 'scripts/restore-backup.js', zipFile], { cwd: ROOT, env });
    assert.ok(fs.existsSync(path.join(restoreDir, 'trip.db')));
    assert.ok(fs.existsSync(path.join(restoreDir, 'uploads', path.basename(uploadedImage))));
    const { DatabaseSync } = require('node:sqlite');
    let copy = new DatabaseSync(path.join(restoreDir, 'trip.db'));
    assert.ok(copy.prepare('SELECT password_hash FROM users').all().every((u) => u.password_hash === ''));
    assert.ok(copy.prepare('SELECT COUNT(*) AS n FROM leads').get().n >= 0);
    copy.close();
    execFileSync(process.execPath, ['--no-warnings', 'scripts/reset-password.js', 'admin'], { cwd: ROOT, env: { ...env, NEW_PASSWORD: 'matkhau-moi-123' } });
    copy = new DatabaseSync(path.join(restoreDir, 'trip.db'));
    const h = copy.prepare("SELECT password_hash FROM users WHERE username = 'admin'").get().password_hash;
    copy.close();
    assert.ok(require('bcryptjs').compareSync('matkhau-moi-123', h));
  } finally { fs.rmSync(restoreDir, { recursive: true, force: true }); }
});

test('2. khôi phục: file zip hỏng / không phải bản sao lưu -> báo lỗi rõ, dữ liệu hiện tại không đổi', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trip-restore-bad-'));
  try {
    fs.writeFileSync(path.join(dir, 'trip.db'), 'du-lieu-hien-tai');
    const bad = path.join(dir, 'bad.zip'); fs.writeFileSync(bad, 'khong phai zip');
    let msg = '';
    try { execFileSync(process.execPath, ['--no-warnings', 'scripts/restore-backup.js', bad], { cwd: ROOT, env: { ...process.env, DATA_DIR: dir }, stdio: 'pipe' }); }
    catch (e) { msg = String(e.stderr); }
    assert.match(msg, /KHÔNG khôi phục được/);
    assert.equal(fs.readFileSync(path.join(dir, 'trip.db'), 'utf8'), 'du-lieu-hien-tai');
    assert.deepEqual(fs.readdirSync(dir).sort(), ['bad.zip', 'trip.db'], 'không để lại thư mục tạm / file đổi tên');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('2. sao lưu: chỉ tài khoản chủ tải được; nút nằm ngoài khối Google', async () => {
  let csrf = await admin.csrf('/admin/account');
  await admin.form('/admin/account/users', { _csrf: csrf, username: 'nhanvien2', password: 'matkhau456' });
  const staff = new Client(base);
  assert.equal((await staff.login('nhanvien2', 'matkhau456', '10.200.0.2')).status, 302);
  assert.equal((await staff.get('/admin/backup')).status, 403);
  assert.ok(!(await (await staff.get('/admin/settings')).text()).includes('href="/admin/backup"'));
  const html = await (await admin.get('/admin/settings')).text();
  const googleCard = html.split('Kết nối Google Sheet')[1].split('</div>')[0];
  assert.ok(!googleCard.includes('/admin/backup'), 'nút sao lưu không nằm trong khối Google');
  assert.ok(html.includes('href="/admin/backup"'));
  csrf = await admin.csrf('/admin/account');
});

// ---------------------------------------------------------------- 3. Form khi không có JavaScript
const urlencoded = (p, data, headers = {}) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'text/html', ...headers }, body: new URLSearchParams(data) });

test('3. Referrer-Policy giữ Origin cho form cùng website', async () => {
  assert.equal((await fetch(base + '/')).headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
});

test('3. form tư vấn gửi không qua JavaScript: Origin null + Sec-Fetch-Site same-origin, trả trang HTML', async () => {
  const ok = await urlencoded('/api/leads', { name: 'Khách Không JS', phone: '0905111222', service: 'Visa Hàn Quốc' },
    { Origin: 'null', 'Sec-Fetch-Site': 'same-origin', Referer: base + '/visa/han-quoc', 'X-Forwarded-For': '10.3.0.1' });
  assert.equal(ok.status, 200);
  assert.match(ok.headers.get('content-type'), /text\/html/);
  const html = txt(await ok.text());
  assert.match(html, /TRIP đã nhận thông tin/);
  assert.match(html, /href="\/visa\/han-quoc"/);
  assert.equal(db().prepare("SELECT source_page FROM leads WHERE name = 'Khách Không JS'").get().source_page, '/visa/han-quoc');

  const bad = await urlencoded('/api/leads', { name: '', phone: '1', service: '' }, { 'X-Forwarded-For': '10.3.0.2' });
  assert.equal(bad.status, 400);
  assert.match(txt(await bad.text()), /Vui lòng nhập họ tên/);

  const nullOnly = await urlencoded('/api/leads', { name: 'X Y', phone: '0905111222', service: 'Khác' }, { Origin: 'null', 'X-Forwarded-For': '10.3.0.3' });
  assert.equal(nullOnly.status, 403, 'Origin null không kèm Sec-Fetch-Site vẫn bị chặn');
  const evil = await urlencoded('/api/leads', { name: 'X Y', phone: '0905111222', service: 'Khác' }, { Origin: 'https://evil.example', 'Sec-Fetch-Site': 'same-origin', 'X-Forwarded-For': '10.3.0.4' });
  assert.equal(evil.status, 403);

  // Referer "//evil.com" (đường dẫn bắt đầu bằng //) không thành link sang website khác; ?token= không bị lưu
  const r1 = await urlencoded('/api/leads', { name: 'Khách Ref', phone: '0905111224', service: 'Khác' }, { Referer: base + '//evil.com/x', 'X-Forwarded-For': '10.3.0.6' });
  assert.match(txt(await r1.text()), /href="\/"/);
  assert.ok(!(await (await urlencoded('/api/leads', { name: 'Khách Ref2', phone: '0905111225', service: 'Khác' }, { Referer: base + '/\\evil.com', 'X-Forwarded-For': '10.3.0.7' })).text()).includes('evil.com'));
  await urlencoded('/api/leads', { name: 'Khách Token', phone: '0905111226', service: 'Khác' }, { Referer: base + '/huy-dang-ky?token=bimat', 'X-Forwarded-For': '10.3.0.8' });
  assert.equal(db().prepare("SELECT source_page FROM leads WHERE name = 'Khách Token'").get().source_page, '/huy-dang-ky');

  const json = await fetch(base + '/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.3.0.5' }, body: JSON.stringify({ name: 'Khách JS', phone: '0905111223', service: 'Khác' }) });
  assert.equal((await json.json()).ok, true, 'form có JavaScript vẫn nhận JSON');
});

// ---------------------------------------------------------------- 4. Hết phiên khi lưu nhanh trong Dashboard
test('4. requireAdmin trả 401 JSON cho request fetch; form thường vẫn chuyển sang trang đăng nhập', async () => {
  const r = await fetch(base + '/admin/leads/1', { method: 'POST', redirect: 'manual', headers: { 'x-requested-with': 'fetch', 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'status=won' });
  assert.equal(r.status, 401);
  assert.equal((await r.json()).ok, false);
  const j = await fetch(base + '/admin/leads', { redirect: 'manual', headers: { Accept: 'application/json' } });
  assert.equal(j.status, 401);
  const page = await fetch(base + '/admin/leads', { redirect: 'manual' });
  assert.equal(page.status, 302);
  const js = fs.readFileSync(path.join(ROOT, 'public/js/admin.js'), 'utf8');
  assert.match(js, /res\.ok === true \? '✓ Đã lưu'/, 'chỉ báo "Đã lưu" khi ok:true');
  assert.match(js, /r\.redirected/, 'bị chuyển hướng không tính là đã lưu');
});

// ---------------------------------------------------------------- 5. Form đánh giá
const review = (ip, body) => fetch(base + '/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip }, body: JSON.stringify(body) });
test('5. đánh giá: lần gửi lỗi không tính vào giới hạn; câu báo khi bị chặn rõ ràng; không chọn sẵn 5 sao', async () => {
  const ip = '10.5.0.1';
  for (let i = 0; i < 4; i++) assert.equal((await review(ip, { name: 'A', rating: 5, content: 'ngắn' })).status, 400);
  for (let i = 0; i < 3; i++) assert.equal((await review(ip, { name: 'Chị Hoa', rating: 4, content: 'Dịch vụ tốt, tư vấn nhanh và rõ ràng.' })).status, 200);
  const blocked = await review(ip, { name: 'Chị Hoa', rating: 4, content: 'Dịch vụ tốt, tư vấn nhanh và rõ ràng.' });
  assert.equal(blocked.status, 429);
  assert.match((await blocked.json()).error, /3 đánh giá trong 1 giờ/);

  // Đăng ký nhận tin & giới hạn chung cũng bỏ qua lần gửi lỗi
  const sub = (email) => fetch(base + '/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.5.0.2' }, body: JSON.stringify({ email }) });
  for (let i = 0; i < 6; i++) assert.equal((await sub('sai')).status, 400);
  assert.equal((await sub('dung-dinh-dang@gmail.com')).status, 200);
  const lead = (b) => fetch(base + '/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.5.0.3' }, body: JSON.stringify(b) });
  for (let i = 0; i < 21; i++) assert.equal((await lead({ name: '', phone: '1' })).status, 400);
  assert.equal((await lead({ name: 'Anh Nam', phone: '0905333444', service: 'Khác' })).status, 200);

  const html = await (await fetch(base + '/danh-gia')).text();
  const stars = html.split('class="star-input"')[1].split('</div>')[0];
  assert.ok(!/checked/.test(stars), 'không chọn sẵn số sao');
  const js = fs.readFileSync(path.join(ROOT, 'public/js/site.js'), 'utf8');
  assert.match(js, /ít nhất 15 ký tự/, 'kiểm tra độ dài nội dung ở trình duyệt');
  assert.match(js, /Vui lòng chọn số sao/);
});

// ---------------------------------------------------------------- 6. Đăng nhập
test('6. giới hạn đăng nhập: IP + tên chặt (10/15 phút), chỉ theo tên rộng (100/giờ) để không khoá được tài khoản chủ', async () => {
  const c = new Client(base);
  const csrf = await c.csrf('/admin/login');
  const tryLogin = (ip, password) => c.form('/admin/login', { _csrf: csrf, username: 'nhanvien2', password }, { 'X-Forwarded-For': ip });
  for (let i = 1; i <= 10; i++) assert.equal((await tryLogin('10.6.0.1', 'sai' + i)).status, 401);
  assert.equal((await tryLogin('10.6.0.1', 'sai')).status, 429, 'cùng IP: bị chặn sau 10 lần sai');
  // Kẻ xấu sai 10 lần từ nhiều IP khác nhau: chủ tài khoản ở IP khác vẫn đăng nhập được
  for (let i = 2; i <= 11; i++) await tryLogin(`10.6.0.${i}`, 'sai');
  assert.equal((await tryLogin('10.6.9.9', 'matkhau456')).status, 302, 'chủ tài khoản không bị khoá');
  const src = fs.readFileSync(path.join(ROOT, 'src/routes/admin.js'), 'utf8');
  assert.match(src, /limit: 100/, 'giới hạn theo tên đăng nhập (dò mật khẩu phân tán)');
});

test('6. bcrypt độ khó 12; hash cũ được băm lại khi đăng nhập; hash trống không đăng nhập được', async () => {
  const bcrypt = require('bcryptjs');
  const d = db();
  d.prepare("UPDATE users SET password_hash = ? WHERE username = 'nhanvien2'").run(bcrypt.hashSync('matkhau456', 10));
  const c = new Client(base);
  assert.equal((await c.login('nhanvien2', 'matkhau456', '10.6.2.1')).status, 302);
  assert.equal(bcrypt.getRounds(d.prepare("SELECT password_hash FROM users WHERE username = 'nhanvien2'").get().password_hash), 12);
  const adminHash = d.prepare("SELECT password_hash FROM users WHERE username = 'admin'").get().password_hash;
  assert.equal(bcrypt.getRounds(adminHash), 12, 'tài khoản tạo mới dùng độ khó 12');
  d.prepare("UPDATE users SET password_hash = '' WHERE username = 'nhanvien2'").run();
  assert.equal((await new Client(base).login('nhanvien2', '', '10.6.2.2')).status, 401);
  const src = fs.readFileSync(path.join(ROOT, 'src/routes/admin.js'), 'utf8');
  assert.match(src, /DUMMY_HASH/, 'so sánh với hash giả khi không có tài khoản');
});

// ---------------------------------------------------------------- 8. Vận hành
test('8. dọn ảnh: chỉ xoá ảnh không dùng và cũ hơn 1 ngày', async () => {
  const dir = path.join(tmp, 'uploads');
  const oldOrphan = path.join(dir, 'cu-khong-dung.webp');
  const newOrphan = path.join(dir, 'moi-khong-dung.webp');
  fs.writeFileSync(oldOrphan, 'x'); fs.writeFileSync(newOrphan, 'x');
  const twoDaysAgo = new Date(Date.now() - 2 * 86400e3);
  fs.utimesSync(oldOrphan, twoDaysAgo, twoDaysAgo);
  fs.utimesSync(path.join(dir, path.basename(uploadedImage)), twoDaysAgo, twoDaysAgo);
  const csrf = await admin.csrf('/admin/settings');
  assert.equal((await admin.form('/admin/uploads/cleanup', { _csrf: csrf })).status, 302);
  assert.ok(!fs.existsSync(oldOrphan), 'ảnh cũ không dùng bị xoá');
  assert.ok(fs.existsSync(newOrphan), 'ảnh mới tải (có thể đang soạn bài) được giữ');
  assert.ok(fs.existsSync(path.join(dir, path.basename(uploadedImage))), 'ảnh đang dùng ở tour được giữ');
});

test('8. /healthz kiểm tra ghi được ổ đĩa', async () => {
  const r = await fetch(base + '/healthz');
  assert.equal(await r.text(), 'ok');
  assert.ok(fs.existsSync(path.join(tmp, '.healthz')));
});

test('8. đồng bộ thủ công: dừng ở lỗi đầu tiên, có hạn thời gian, không chạy chồng', async () => {
  const d = db();
  d.exec('UPDATE leads SET sheet_synced = 1; UPDATE subscribers SET sheet_synced = 1');
  for (let i = 0; i < 3; i++) d.prepare("INSERT INTO leads (name, phone, service, sheet_synced) VALUES (?, '0905000000', 'Khác', 0)").run('Chưa đồng bộ ' + i);
  mock.mode = 'fail';
  let before = callsOf('lead').length;
  let csrf = await admin.csrf('/admin');
  await admin.form('/admin/sync', { _csrf: csrf });
  assert.equal(callsOf('lead').length - before, 1, 'dừng ở lỗi đầu tiên');

  mock.mode = 'ok'; mock.delay = 2000; // chậm hơn SYNC_TIMEOUT_MS (300ms)
  before = callsOf('lead').length;
  const t0 = Date.now();
  csrf = await admin.csrf('/admin');
  await admin.form('/admin/sync', { _csrf: csrf });
  assert.ok(Date.now() - t0 < 1500, 'không chờ quá thời hạn');
  assert.equal(callsOf('lead').length - before, 1);

  mock.delay = 200;
  const google = require('../src/lib/google');
  const [a, b] = await Promise.all([google.syncPending({ timeoutMs: 1000 }), google.syncPending({ timeoutMs: 1000 })]);
  assert.ok(b.busy && !a.busy, 'lượt thứ hai bị từ chối khi lượt đầu đang chạy');
  mock.delay = 0;
});

test('8. ảnh khai báo kích thước khổng lồ bị từ chối; đường dẫn ảnh có ".." bị bỏ', async () => {
  // PNG 1x1 rồi sửa header thành 10000 x 8000 = 80 megapixel (vượt giới hạn 50MP mới, nhưng dưới mức mặc định
  // ~268MP của sharp, nên chỉ bị chặn nhờ limitInputPixels) và tính lại CRC
  const png = Buffer.from(await require('sharp')({ create: { width: 1, height: 1, channels: 3, background: '#fff' } }).png().toBuffer());
  png.writeUInt32BE(10000, 16); png.writeUInt32BE(8000, 20);
  const zlib = require('node:zlib');
  png.writeUInt32BE(zlib.crc32(png.subarray(12, 29)) >>> 0, 29);
  const csrf = await admin.csrf('/admin/posts/new');
  const fd = new FormData(); fd.append('_csrf', csrf); fd.append('file', new Blob([png], { type: 'image/png' }), 'bom.png');
  assert.equal((await fetch(base + '/admin/upload', { method: 'POST', headers: { cookie: admin.cookie }, body: fd })).status, 400);
  assert.match(fs.readFileSync(path.join(ROOT, 'src/routes/admin.js'), 'utf8'), /limitInputPixels: 50e6/);

  const c2 = await admin.csrf('/admin/tours/new');
  await admin.form('/admin/tours/new', { _csrf: c2, title: 'Tour đường dẫn lạ', image: '/img/../../server.js', region: 'quoc-te' });
  assert.equal(db().prepare("SELECT image FROM tours WHERE title = 'Tour đường dẫn lạ'").get().image, null);
  const c3 = await admin.csrf('/admin/posts/new');
  await admin.form('/admin/posts/new', { _csrf: c3, title: 'Bài đường dẫn lạ', cover: '/uploads/../trip.db', status: 'draft' });
  assert.equal(db().prepare("SELECT cover FROM posts WHERE title = 'Bài đường dẫn lạ'").get().cover, null);
});

// ---------------------------------------------------------------- 9. Frontend
test('9. ảnh WebP nhiều cỡ (srcset) và cờ quốc gia lưu tại chỗ', async () => {
  const html = await (await fetch(base + '/tour')).text();
  const m = html.match(/<source type="image\/webp" srcset="(\/img\/tours\/[\w-]+-\d+\.webp) \d+w/);
  assert.ok(m, 'thẻ tour có srcset WebP');
  const img = await fetch(base + m[1]);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get('content-type'), 'image/webp');
  for (const p of ['/', '/bang-gia', '/visa/chau-au', '/visa/nuoc-khac', '/dich-vu', '/gioi-thieu']) {
    const page = await (await fetch(base + p)).text();
    assert.ok(!page.includes('flagcdn.com'), `${p} không dùng cờ từ CDN ngoài`);
    for (const f of page.match(/\/img\/flags\/[a-z]{2}\.png/g) || []) assert.ok(fs.existsSync(path.join(ROOT, 'public', f)), f);
  }
  const flag = await fetch(base + '/img/flags/kr.png');
  assert.equal(flag.headers.get('content-type'), 'image/png');
});

test('9. menu điện thoại quản lý focus; lưới admin co được (minmax)', () => {
  const js = fs.readFileSync(path.join(ROOT, 'public/js/site.js'), 'utf8');
  assert.match(js, /function openNav\(\)/);
  assert.match(js, /el\.inert = true/, 'nội dung phía sau menu bị inert khi mở');
  assert.match(js, /closeNav\(true\)/, 'đóng menu bằng Esc / nút trả focus về nút menu');
  const css = fs.readFileSync(path.join(ROOT, 'public/css/admin.css'), 'utf8');
  assert.match(css, /\.grid--2 \{ grid-template-columns: minmax\(0, 1\.6fr\) minmax\(0, 1fr\); \}/);
});

// ---------------------------------------------------------------- 10. Tài liệu
test('10. hướng dẫn TRUST_PROXY đếm trong "xff", không phải "ips"', () => {
  const doc = fs.readFileSync(path.join(ROOT, 'docs/HUONG-DAN-COWORK-TRIEN-KHAI.md'), 'utf8');
  const sec = doc.split('## Phần 4')[1].split('## Phần 5')[0];
  assert.match(sec, /chuỗi `"xff"`/);
  assert.match(sec, /Không đếm trong `"ips"`/);
});
