// Kiểm thử trên trình duyệt thật (Playwright + Chromium): focus trong menu điện thoại, popup tư vấn,
// và trang Đánh giá trong Dashboard không tràn ngang. Không nằm trong `npm test` vì cần Chromium.
//   npm run test:browser
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'trip-browser-'));
let server; let B; let b;
before(async () => {
  Object.assign(process.env, { DATA_DIR: tmp, ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: 'matkhau123' });
  delete process.env.GOOGLE_SCRIPT_URL;
  const app = require('../../server');
  server = app.listen(0);
  B = `http://127.0.0.1:${server.address().port}`;
  b = await chromium.launch();
});
after(async () => { await b.close(); server.close(); fs.rmSync(tmp, { recursive: true, force: true }); });
const ok = (cond, msg) => assert.ok(cond, msg);

test('menu điện thoại, popup tư vấn và Dashboard trên trình duyệt thật', async () => {
  for (const w of [390, 768]) {
    const d = await b.newPage({ viewport: { width: w, height: 844 } });
    await d.goto(B + '/', { waitUntil: 'networkidle' });
    const info = () => d.evaluate(() => ({
      open: document.querySelector('#nav').classList.contains('is-open'),
      inNav: !!document.activeElement.closest('#nav'), id: document.activeElement.id,
      inert: document.querySelector('#main').inert, label: document.querySelector('#burger').getAttribute('aria-label'),
    }));
    await d.click('#burger'); await d.waitForTimeout(300);
    let s = await info();
    ok(s.open && s.inNav && s.inert && s.label === 'Đóng menu', `${w}px mở menu: focus vào menu, nội dung phía sau inert, nhãn "Đóng menu"`);
    let escaped = false;
    for (let i = 0; i < 40; i++) { await d.keyboard.press('Tab'); const t = await info(); if (!t.inNav && t.id !== 'burger') escaped = true; }
    ok(!escaped, `${w}px Tab 40 lần không lọt ra ngoài menu`);
    await d.keyboard.press('Escape'); await d.waitForTimeout(200);
    s = await info();
    ok(!s.open && s.id === 'burger' && !s.inert && s.label === 'Mở menu', `${w}px Esc: đóng menu, focus về nút menu, bỏ inert`);
    await d.click('#burger'); await d.waitForTimeout(300);
    await d.click('#burger'); await d.waitForTimeout(200);
    s = await info();
    ok(!s.open && s.id === 'burger' && !s.inert, `${w}px bấm lại nút menu: đóng, focus ở nút menu`);
    await d.click('#burger'); await d.waitForTimeout(300);
    await d.click('#nav [data-open-lead]'); await d.waitForTimeout(400);
    s = await info();
    const modalFocus = await d.evaluate(() => document.activeElement.id);
    ok(!s.open && !s.inert && modalFocus === 'modal-name', `${w}px bấm "Tư vấn" trong menu: menu đóng, popup mở, focus ô Họ tên`);
    await d.keyboard.press('Escape'); await d.waitForTimeout(300);
    ok((await d.evaluate(() => document.activeElement.id)) === 'burger', `${w}px đóng popup: focus về nút menu`);
    await d.click('#burger'); await d.waitForTimeout(300);
    await d.setViewportSize({ width: 1300, height: 844 }); await d.waitForTimeout(300);
    s = await info();
    ok(!s.open && !s.inert, `${w}px mở menu rồi phóng to cửa sổ: menu tự đóng, bỏ inert`);
    await d.close();
  }
  // Trang Đánh giá trong Dashboard: không tràn ngang
  const a = await b.newPage({ viewport: { width: 1024, height: 800 } });
  await a.goto(B + '/admin/login'); await a.fill('[name=username]', 'admin'); await a.fill('[name=password]', 'matkhau123');
  await Promise.all([a.waitForNavigation(), a.click('button[type=submit]')]);
  for (const w of [1024, 1280, 390]) {
    await a.setViewportSize({ width: w, height: 800 });
    await a.goto(B + '/admin/reviews', { waitUntil: 'networkidle' });
    const ov = await a.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    ok(ov <= 0, `Dashboard /admin/reviews ${w}px không tràn ngang (lệch ${ov}px)`);
  }
});
