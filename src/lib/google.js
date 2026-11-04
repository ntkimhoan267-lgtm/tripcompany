// Gửi dữ liệu sang Google Apps Script (xem thư mục google-apps-script/).
// Apps Script sẽ: ghi vào Google Sheet (tự tạo nếu chưa có) + gửi email thông báo tới các Gmail cấu hình trong script.
//
// Bảo mật: nội dung được ký HMAC-SHA256 bằng GOOGLE_SCRIPT_SECRET kèm dấu thời gian,
// nên mã bí mật không đi trên đường truyền và request cũ không dùng lại được.
const crypto = require('node:crypto');
const config = require('../config');
const db = require('../db');

function isConfigured() {
  return Boolean(config.googleScriptUrl && config.googleScriptSecret);
}

function sign(payload) {
  return crypto.createHmac('sha256', config.googleScriptSecret).update(payload).digest('hex');
}

async function callScript(action, data, timeoutMs = 30000) {
  if (!isConfigured()) return { ok: false, error: 'Chưa cấu hình GOOGLE_SCRIPT_URL / GOOGLE_SCRIPT_SECRET' };
  const payload = JSON.stringify({ action, ts: Date.now(), siteUrl: config.siteUrl, data });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // Apps Script trả về 302 tới googleusercontent; fetch tự theo redirect (POST -> GET) và nhận JSON.
    const res = await fetch(config.googleScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ payload, sig: sign(payload) }),
      redirect: 'follow',
      signal: controller.signal,
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = null; }
    // transport: true = không nhận được câu trả lời của Apps Script (không biết phía Google đã làm gì chưa)
    if (!json || typeof json !== 'object') return { ok: false, transport: true, error: `Phản hồi không hợp lệ (HTTP ${res.status})` };
    return json;
  } catch (err) {
    return { ok: false, transport: true, error: err.name === 'AbortError' ? 'Hết thời gian chờ' : err.message };
  } finally {
    clearTimeout(timer);
  }
}

// Chỉ gửi các trường cần thiết (không gửi token huỷ đăng ký, ghi chú nội bộ...)
const leadPayload = (l, resync) => ({ id: l.id, name: l.name, phone: l.phone, service: l.service, note: l.note, source_page: l.source_page, created_at: l.created_at, resync: Boolean(resync) });
const subPayload = (s, resync) => ({ id: s.id, email: s.email, name: s.name, source_page: s.source_page, created_at: s.created_at, resync: Boolean(resync) });

async function syncLead(lead, resync = false, timeoutMs) {
  const r = await callScript('lead', leadPayload(lead, resync), timeoutMs);
  if (r.ok) db.prepare('UPDATE leads SET sheet_synced = 1 WHERE id = ?').run(lead.id);
  else console.warn(`[google] Lead #${lead.id} chưa đồng bộ: ${r.error}`);
  return r;
}

async function syncSubscriber(sub, resync = false, timeoutMs) {
  const r = await callScript('subscribe', subPayload(sub, resync), timeoutMs);
  if (r.ok) db.prepare('UPDATE subscribers SET sheet_synced = 1 WHERE id = ?').run(sub.id);
  else console.warn(`[google] Subscriber #${sub.id} chưa đồng bộ: ${r.error}`);
  return r;
}

// Đồng bộ lại bản ghi chưa lên Sheet (nút "Đồng bộ" trong Dashboard và việc tự đồng bộ 10 phút/lần).
// - Cờ syncRunning: hai lượt không chạy chồng lên nhau (tránh gửi trùng email thông báo).
// - Mỗi lần gọi có thời hạn ngắn (mặc định 8 giây) và dừng ở lỗi đầu tiên: Google đang lỗi thì không bắt
//   nhân viên chờ cả chục bản ghi hết thời gian.
let syncRunning = false;
async function syncPending({ timeoutMs = config.syncTimeoutMs, limit = 20, olderThanMinutes = 0 } = {}) {
  if (syncRunning) return { ok: false, busy: true, synced: 0, error: 'Đang có một lượt đồng bộ khác, vui lòng đợi.' };
  syncRunning = true;
  let synced = 0;
  try {
    const age = olderThanMinutes ? ` AND created_at < datetime('now', '-${Number(olderThanMinutes)} minutes')` : '';
    const leads = db.prepare(`SELECT * FROM leads WHERE sheet_synced = 0${age} ORDER BY id LIMIT ?`).all(limit);
    for (const l of leads) {
      const r = await syncLead(l, false, timeoutMs);
      if (!r.ok) return { ok: false, synced, error: r.error };
      synced++;
    }
    const subs = db.prepare(`SELECT * FROM subscribers WHERE sheet_synced = 0${age} ORDER BY id LIMIT ?`).all(limit);
    for (const s of subs) {
      const r = await syncSubscriber(s, false, timeoutMs);
      if (!r.ok) return { ok: false, synced, error: r.error };
      synced++;
    }
    return { ok: true, synced };
  } finally {
    syncRunning = false;
  }
}

module.exports = { isConfigured, callScript, syncLead, syncSubscriber, syncPending, sign };
