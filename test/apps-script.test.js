// Kiểm thử logic hạn mức Gmail trong google-apps-script/Code.gs (mục 7).
// Nạp đúng file Code.gs vào một môi trường giả lập MailApp / Sheet / Properties của Google.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const CODE = fs.readFileSync(path.join(__dirname, '..', 'google-apps-script', 'Code.gs'), 'utf8');

function loadScript(quota) {
  const state = { quota, mails: [], rows: [] };
  const props = new Map([['SHEET_ID', 'sheet-1']]);
  const sheet = {
    getLastRow: () => 1 + state.rows.length,
    appendRow: (r) => state.rows.push(r),
    getRange: () => ({ getValues: () => [], getDisplayValues: () => [] }),
  };
  const ctx = {
    MailApp: {
      getRemainingDailyQuota: () => state.quota,
      // Hạn mức Gmail tính theo người nhận: 1 email gửi 2 địa chỉ = 2 lượt
      sendEmail: (o) => {
        const n = String(o.to).split(',').length;
        if (state.quota < n) throw new Error('Service invoked too many times for one day: email.');
        state.quota -= n; state.mails.push(o);
      },
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (props.has(k) ? props.get(k) : null), setProperty: (k, v) => props.set(k, v) }) },
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet, getUrl: () => 'https://sheet' }) },
    Utilities: { formatDate: () => '20261104' },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'ntkimhoan267@gmail.com' }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {} }) },
  };
  vm.createContext(ctx);
  vm.runInContext(CODE, ctx);
  return { ctx, state };
}
const lead = (id) => ({ id, name: 'Khách ' + id, phone: '0905000000', service: 'Visa Hàn Quốc', created_at: '2026-11-04 01:00:00' });
const recipients = (n) => Array.from({ length: n }, (_, i) => ({ email: `khach${i}@gmail.com`, token: 't' + i }));

test('7. phần dự trữ tính theo số người nhận: 25 email báo khách × 2 Gmail = 50 lượt', () => {
  const { ctx } = loadScript(100);
  assert.equal(ctx.NOTIFY_EMAILS.length, 2);
  assert.equal(ctx.MAIL_RESERVE, 50);
});

test('7. bản tin không lấn vào phần dự trữ cho email báo khách mới', () => {
  const { ctx, state } = loadScript(100);
  const r = ctx.sendNewsletter({ subject: 'Tour', body: 'x', recipients: recipients(100) }, 'https://tripdn.com');
  assert.equal(r.sent.length, 50, 'chỉ gửi phần vượt quá dự trữ (100 - 50)');
  assert.equal(state.quota, 50);
  // Sau bản tin: vẫn gửi đủ 25 email báo khách mới (mỗi email 2 người nhận)
  for (let i = 1; i <= 25; i++) ctx.handleLead(lead(i), 'https://tripdn.com');
  assert.equal(state.mails.filter((m) => /Khách mới/.test(m.subject)).length, 25);
  assert.equal(state.quota, 0);
});

test('7. hết phần vượt dự trữ thì bản tin dừng, không gửi', () => {
  const { ctx } = loadScript(50);
  const r = ctx.sendNewsletter({ subject: 'Tour', body: 'x', recipients: recipients(10) }, 'https://tripdn.com');
  assert.equal(r.ok, false);
  assert.equal(r.sent.length, 0);
});

test('7. báo đăng ký nhận tin không dùng phần dự trữ; báo khách mới thì được dùng', () => {
  const { ctx, state } = loadScript(51); // còn 51 lượt: gửi báo đăng ký (2 lượt) sẽ làm còn 49 < 50
  ctx.handleSubscribe({ id: 1, email: 'a@gmail.com', created_at: '2026-11-04 01:00:00' });
  assert.equal(state.mails.length, 0, 'không gửi báo đăng ký nhận tin');
  assert.equal(state.rows.length, 1, 'nhưng vẫn ghi vào Sheet');
  ctx.handleLead(lead(1), 'https://tripdn.com');
  assert.equal(state.mails.length, 1, 'báo khách mới vẫn gửi');
});

test('7. còn ít hơn số Gmail nhận thì không gửi báo khách mới (không lỗi), vẫn ghi Sheet', () => {
  const { ctx, state } = loadScript(1);
  const r = ctx.handleLead(lead(1), 'https://tripdn.com');
  assert.equal(r.ok, true);
  assert.equal(r.emailSkipped, true);
  assert.equal(state.mails.length, 0);
  assert.equal(state.rows.length, 1);
});

test('7. bản tin hiện tên TRIP Đà Nẵng, khách trả lời về Gmail công ty', () => {
  const { ctx, state } = loadScript(100);
  ctx.sendNewsletter({ subject: 'Tour', body: 'x', recipients: recipients(1) }, 'https://tripdn.com');
  assert.equal(state.mails[0].name, 'TRIP Đà Nẵng');
  assert.equal(state.mails[0].replyTo, 'triptranslate.com@gmail.com');
});

test('7. email sai định dạng được báo lại (skipped) để website không gửi lại mãi', () => {
  const { ctx } = loadScript(100);
  const r = ctx.sendNewsletter({ subject: 'Tour', body: 'x', recipients: [{ email: 'sai-dinh-dang', token: '' }, { email: 'dung@gmail.com', token: 't' }] }, 'https://tripdn.com');
  assert.deepEqual([...r.skipped], ['sai-dinh-dang']);
  assert.deepEqual([...r.sent], ['dung@gmail.com']);
  assert.equal(r.remaining, 0);
});
