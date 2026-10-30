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
    if (!json || typeof json !== 'object') return { ok: false, error: `Phản hồi không hợp lệ (HTTP ${res.status})` };
    return json;
  } catch (err) {
    return { ok: false, error: err.name === 'AbortError' ? 'Hết thời gian chờ' : err.message };
  } finally {
    clearTimeout(timer);
  }
}

// Chỉ gửi các trường cần thiết (không gửi token huỷ đăng ký, ghi chú nội bộ...)
const leadPayload = (l, resync) => ({ id: l.id, name: l.name, phone: l.phone, service: l.service, note: l.note, source_page: l.source_page, created_at: l.created_at, resync: Boolean(resync) });
const subPayload = (s, resync) => ({ id: s.id, email: s.email, name: s.name, source_page: s.source_page, created_at: s.created_at, resync: Boolean(resync) });

async function syncLead(lead, resync = false) {
  const r = await callScript('lead', leadPayload(lead, resync));
  if (r.ok) db.prepare('UPDATE leads SET sheet_synced = 1 WHERE id = ?').run(lead.id);
  else console.warn(`[google] Lead #${lead.id} chưa đồng bộ: ${r.error}`);
  return r;
}

async function syncSubscriber(sub, resync = false) {
  const r = await callScript('subscribe', subPayload(sub, resync));
  if (r.ok) db.prepare('UPDATE subscribers SET sheet_synced = 1 WHERE id = ?').run(sub.id);
  else console.warn(`[google] Subscriber #${sub.id} chưa đồng bộ: ${r.error}`);
  return r;
}

module.exports = { isConfigured, callScript, syncLead, syncSubscriber, sign };
