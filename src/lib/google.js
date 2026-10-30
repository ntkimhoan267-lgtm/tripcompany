// Gửi dữ liệu sang Google Apps Script (xem thư mục google-apps-script/).
// Apps Script sẽ: ghi vào Google Sheet (tự tạo nếu chưa có) + gửi email thông báo tới các Gmail cấu hình.
const config = require('../config');
const db = require('../db');
const { getSettings } = require('./helpers');

function isConfigured() {
  return Boolean(config.googleScriptUrl);
}

async function callScript(action, payload, timeoutMs = 20000) {
  if (!isConfigured()) return { ok: false, error: 'GOOGLE_SCRIPT_URL chưa được cấu hình' };
  const notifyEmails = (getSettings().notify_emails || '').split(/[,;\s]+/).filter(Boolean);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // Apps Script trả về 302 tới googleusercontent; fetch tự theo redirect (POST -> GET) và nhận JSON.
    const res = await fetch(config.googleScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ secret: config.googleScriptSecret, action, notifyEmails, siteUrl: config.siteUrl, data: payload }),
      redirect: 'follow',
      signal: controller.signal,
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { ok: false, error: `Phản hồi không hợp lệ (HTTP ${res.status})` };
    }
  } catch (err) {
    return { ok: false, error: err.name === 'AbortError' ? 'Hết thời gian chờ' : err.message };
  } finally {
    clearTimeout(timer);
  }
}

async function syncLead(lead) {
  const r = await callScript('lead', lead);
  if (r.ok) db.prepare('UPDATE leads SET sheet_synced = 1 WHERE id = ?').run(lead.id);
  else console.warn(`[google] Lead #${lead.id} chưa đồng bộ: ${r.error}`);
  return r;
}

async function syncSubscriber(sub) {
  const r = await callScript('subscribe', sub);
  if (r.ok) db.prepare('UPDATE subscribers SET sheet_synced = 1 WHERE id = ?').run(sub.id);
  else console.warn(`[google] Subscriber #${sub.id} chưa đồng bộ: ${r.error}`);
  return r;
}

module.exports = { isConfigured, callScript, syncLead, syncSubscriber };
