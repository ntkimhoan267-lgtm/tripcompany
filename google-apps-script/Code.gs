/**
 * TRIP Website ↔ Google Sheet & Gmail
 * ------------------------------------------------------------
 * - Tự tạo Google Sheet "TRIP Website - Khách hàng" trong Drive (lần đầu chạy hàm setup).
 * - Ghi khách đăng ký tư vấn vào tab "Tư vấn", email nhận tin vào tab "Đăng ký nhận tin".
 * - Gửi email thông báo ngay tới các Gmail trong NOTIFY_EMAILS.
 * - Gửi bản tin tour hàng tháng tới người đăng ký (gọi từ Dashboard website), theo từng đợt vừa hạn mức Gmail.
 *
 * Bảo mật:
 * - Mã bí mật KHÔNG nằm trong code: lưu ở Project Settings > Script properties, khoá TRIP_SECRET
 *   (trùng với biến GOOGLE_SCRIPT_SECRET trên website, tối thiểu 32 ký tự ngẫu nhiên).
 * - Mỗi request được website ký HMAC-SHA256 kèm dấu thời gian; request quá 10 phút hoặc gửi lại sẽ bị từ chối.
 * - Danh sách Gmail nhận thông báo / được chia sẻ Sheet chỉ cấu hình ở đây, website không thay đổi được.
 *
 * Cài đặt: xem docs/HUONG-DAN-GOOGLE-SHEET.md
 */

// ======= CẤU HÌNH =======
var NOTIFY_EMAILS = ['ntkimhoan267@gmail.com', 'triptranslate.com@gmail.com'];
var SHEET_NAME = 'TRIP Website - Khách hàng';
var TZ = 'Asia/Ho_Chi_Minh';
var MAIL_RESERVE = 10;      // chừa lại hạn mức để email thông báo khách mới không bị nghẽn
var NEWSLETTER_BATCH = 80;  // số người nhận tối đa mỗi lần bấm gửi
// =========================

var LEAD_HEADERS = ['Thời gian', 'Họ tên', 'Số điện thoại', 'Dịch vụ', 'Ghi chú của khách', 'Trang nguồn', 'Mã KH (web)', 'Trạng thái'];
var SUB_HEADERS = ['Thời gian', 'Email', 'Tên', 'Trang nguồn', 'Mã (web)'];
var LEAD_ID_COL = 7;
var SUB_ID_COL = 5;

function doPost(e) {
  try {
    var req = verify(e);
    var data = req.data || {};
    switch (req.action) {
      case 'ping':
        return json({ ok: true, sheetUrl: getSpreadsheet().getUrl(), mailQuota: MailApp.getRemainingDailyQuota() });
      case 'lead':
        return json(withLock(function () { return handleLead(data, req.siteUrl); }));
      case 'subscribe':
        return json(withLock(function () { return handleSubscribe(data); }));
      case 'newsletter':
        return json(sendNewsletter(data, req.siteUrl));
      default:
        return json({ ok: false, error: 'Hành động không hợp lệ' });
    }
  } catch (err) {
    return json({ ok: false, error: String((err && err.message) || err) });
  }
}

function doGet() {
  return ContentService.createTextOutput('TRIP Apps Script đang hoạt động.');
}

// ---------- Xác thực request ----------
function verify(e) {
  var secret = PropertiesService.getScriptProperties().getProperty('TRIP_SECRET') || '';
  if (secret.length < 32) throw new Error('Chưa đặt TRIP_SECRET (tối thiểu 32 ký tự) trong Script properties');
  var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  if (typeof body.payload !== 'string' || typeof body.sig !== 'string') throw new Error('Request không hợp lệ');
  var expected = toHex(Utilities.computeHmacSha256Signature(body.payload, secret, Utilities.Charset.UTF_8));
  if (!safeEqual(expected, body.sig)) throw new Error('Sai chữ ký (GOOGLE_SCRIPT_SECRET không khớp TRIP_SECRET)');
  var req = JSON.parse(body.payload);
  if (Math.abs(Date.now() - Number(req.ts)) > 10 * 60 * 1000) throw new Error('Request đã hết hạn');
  var cache = CacheService.getScriptCache();
  if (cache.get('sig_' + body.sig)) throw new Error('Request bị gửi lại');
  cache.put('sig_' + body.sig, '1', 900);
  return req;
}

function toHex(bytes) {
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function withLock(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { return fn(); } finally { lock.releaseLock(); }
}

// ---------- Sheet ----------
function getSpreadsheet() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SHEET_ID');
  if (id) return SpreadsheetApp.openById(id); // lỗi tạm thời sẽ báo lỗi (website tự đồng bộ lại), không tạo Sheet mới
  var ss = SpreadsheetApp.create(SHEET_NAME);
  props.setProperty('SHEET_ID', ss.getId());
  var first = ss.getSheets()[0];
  first.setName('Tư vấn');
  setupSheet(first, LEAD_HEADERS, [150, 180, 120, 220, 320, 160, 90, 110]);
  setupSheet(ss.insertSheet('Đăng ký nhận tin'), SUB_HEADERS, [150, 260, 180, 160, 80]);
  var me = Session.getEffectiveUser().getEmail().toLowerCase();
  NOTIFY_EMAILS.forEach(function (em) {
    if (em.toLowerCase() !== me) { try { ss.addEditor(em); } catch (err) { /* bỏ qua */ } }
  });
  return ss;
}

function setupSheet(sheet, headers, widths) {
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#1f3a52').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  widths.forEach(function (w, i) { sheet.setColumnWidth(i + 1, w); });
}

function sheetByName(ss, name, headers) {
  return ss.getSheetByName(name) || (function () { var s = ss.insertSheet(name); setupSheet(s, headers, []); return s; })();
}

// Đã có dòng với mã web này chưa (để đồng bộ lại không bị trùng)
function hasId(sheet, col, id) {
  var last = sheet.getLastRow();
  if (last < 2) return false;
  var values = sheet.getRange(2, col, last - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) if (String(values[i][0]) === String(id)) return true;
  return false;
}

// created_at từ website là UTC dạng "YYYY-MM-DD HH:MM:SS"
function fmtTime(created) {
  var d = created ? new Date(String(created).replace(' ', 'T') + 'Z') : new Date();
  if (isNaN(d.getTime())) d = new Date();
  return Utilities.formatDate(d, TZ, 'dd/MM/yyyy HH:mm');
}
function safe(v) { v = String(v == null ? '' : v); return /^[=+\-@\t\r]/.test(v) ? "'" + v : v; }
function canMail() { return MailApp.getRemainingDailyQuota() > MAIL_RESERVE; }

// ---------- Khách tư vấn ----------
function handleLead(d, siteUrl) {
  var ss = getSpreadsheet();
  var sheet = sheetByName(ss, 'Tư vấn', LEAD_HEADERS);
  if (hasId(sheet, LEAD_ID_COL, d.id)) return { ok: true, duplicate: true };
  sheet.appendRow([fmtTime(d.created_at), safe(d.name), "'" + String(d.phone || ''), safe(d.service), safe(d.note), safe(d.source_page), d.id, 'Mới']);

  if (d.resync || !canMail()) return { ok: true, emailSkipped: true };
  var phone = String(d.phone || '').replace(/[^\d+]/g, '');
  var html =
    '<div style="font-family:Arial,sans-serif;font-size:15px;color:#1b2b3a">' +
    '<h2 style="color:#1f3a52;margin:0 0 12px">Có khách đăng ký tư vấn trên website TRIP</h2>' +
    '<table cellpadding="8" style="border-collapse:collapse;background:#f4f8fb;border-radius:8px">' +
    row('Họ tên', esc(d.name)) +
    row('Số điện thoại', '<a href="tel:' + phone + '" style="font-size:18px;font-weight:bold;color:#e0602f">' + esc(d.phone) + '</a>') +
    row('Dịch vụ', esc(d.service)) +
    row('Ghi chú', esc(d.note || '—')) +
    row('Trang', esc(d.source_page || '/')) +
    row('Thời gian', esc(fmtTime(d.created_at))) +
    '</table>' +
    '<p style="margin-top:16px"><a href="https://zalo.me/' + phone + '" style="background:#0068ff;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Nhắn Zalo cho khách</a> ' +
    '&nbsp;<a href="' + ss.getUrl() + '">Mở Google Sheet</a>' + (siteUrl ? ' · <a href="' + esc(siteUrl) + '/admin/leads">Mở Dashboard</a>' : '') + '</p></div>';
  MailApp.sendEmail({
    to: NOTIFY_EMAILS.join(','),
    subject: '🔔 Khách mới cần tư vấn: ' + oneLine(d.name) + ' – ' + oneLine(d.service),
    htmlBody: html,
    name: 'Website TRIP',
  });
  return { ok: true };
}

// ---------- Đăng ký nhận tin ----------
function handleSubscribe(d) {
  var ss = getSpreadsheet();
  var sheet = sheetByName(ss, 'Đăng ký nhận tin', SUB_HEADERS);
  if (hasId(sheet, SUB_ID_COL, d.id)) return { ok: true, duplicate: true };
  sheet.appendRow([fmtTime(d.created_at), safe(d.email), safe(d.name), safe(d.source_page), d.id]);
  if (d.resync || !canMail()) return { ok: true, emailSkipped: true };
  MailApp.sendEmail({
    to: NOTIFY_EMAILS.join(','),
    subject: '📩 Đăng ký nhận tin mới: ' + oneLine(d.email),
    htmlBody: '<p style="font-family:Arial,sans-serif">Email <b>' + esc(d.email) + '</b>' + (d.name ? ' (' + esc(d.name) + ')' : '') +
      ' vừa đăng ký nhận bản tin tour hàng tháng trên website TRIP.</p><p><a href="' + ss.getUrl() + '">Mở Google Sheet</a></p>',
    name: 'Website TRIP',
  });
  return { ok: true };
}

// ---------- Bản tin tháng (gửi theo đợt) ----------
function sendNewsletter(d, siteUrl) {
  var list = d.recipients || [];
  var room = Math.min(NEWSLETTER_BATCH, MailApp.getRemainingDailyQuota() - MAIL_RESERVE);
  if (room <= 0) return { ok: false, error: 'Gmail đã hết hạn mức gửi hôm nay. Vui lòng bấm "Gửi tiếp" vào ngày mai.', sent: [] };
  var sent = [];
  var deadline = Date.now() + 4.5 * 60 * 1000; // Apps Script giới hạn 6 phút mỗi lần chạy
  for (var i = 0; i < list.length && sent.length < room && Date.now() < deadline; i++) {
    var r = list[i];
    if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[a-z]{2,}$/i.test(String(r.email))) continue;
    var unsub = r.token ? siteUrl + '/huy-dang-ky?token=' + encodeURIComponent(r.token) : siteUrl;
    MailApp.sendEmail({ to: r.email, subject: oneLine(d.subject), htmlBody: newsletterHtml(d, siteUrl, unsub), name: 'TRIP Đà Nẵng' });
    sent.push(r.email);
  }
  return { ok: true, sent: sent, remaining: list.length - sent.length };
}

function newsletterHtml(d, siteUrl, unsub) {
  var body = esc(d.body).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
  var tours = (d.tours || []).map(function (t) {
    return '<tr><td style="padding:0 0 14px">' +
      '<a href="' + esc(t.url) + '" style="display:block;text-decoration:none;color:#1b2b3a;border:1px solid #e3ebf2;border-radius:12px;overflow:hidden">' +
      (t.image ? '<img src="' + esc(t.image) + '" width="100%" style="display:block;max-height:220px;object-fit:cover" alt="">' : '') +
      '<div style="padding:14px 16px"><div style="font-weight:bold;font-size:16px;color:#1f3a52">' + esc(t.title) + '</div>' +
      '<div style="color:#5b6b7b;font-size:13px;margin:4px 0">' + esc(t.duration || '') + (t.departure ? ' · Khởi hành ' + esc(t.departure) : '') + '</div>' +
      '<div style="color:#e0602f;font-weight:bold">' + (t.price ? 'Giá từ ' + Number(t.price).toLocaleString('vi-VN') + 'đ' : 'Liên hệ để nhận giá') + '</div></div></a></td></tr>';
  }).join('');
  return '<div style="background:#f4f8fb;padding:24px 12px;font-family:Arial,sans-serif">' +
    '<table width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden" cellpadding="0" cellspacing="0">' +
    '<tr><td style="background:#1f3a52;padding:20px 24px"><img src="' + esc(siteUrl) + '/img/logo-horizontal.png" height="40" alt="TRIP"></td></tr>' +
    '<tr><td style="padding:24px;font-size:15px;line-height:1.6;color:#1b2b3a">' + body + '</td></tr>' +
    (tours ? '<tr><td style="padding:0 24px"><table width="100%" cellpadding="0" cellspacing="0">' + tours + '</table></td></tr>' : '') +
    '<tr><td style="padding:8px 24px 24px"><a href="' + esc(siteUrl) + '/tour" style="display:inline-block;background:#f2784b;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">Xem tất cả tour</a></td></tr>' +
    '<tr><td style="padding:16px 24px;background:#f4f8fb;font-size:12px;color:#5b6b7b">TRIP – Phòng 406, Tầng 4, 35 Cao Thắng, Hải Châu, Đà Nẵng<br>' +
    'Bạn nhận email này vì đã đăng ký nhận tin trên ' + esc(siteUrl.replace(/^https?:\/\//, '')) + '. <a href="' + esc(unsub) + '" style="color:#5b6b7b">Huỷ đăng ký</a></td></tr>' +
    '</table></div>';
}

// ---------- Tiện ích ----------
// v phải là HTML đã escape (hoặc do script tự tạo)
function row(k, v) { return '<tr><td style="color:#5b6b7b;white-space:nowrap">' + k + '</td><td><b>' + v + '</b></td></tr>'; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function oneLine(s) { return String(s == null ? '' : s).replace(/[\r\n]+/g, ' ').slice(0, 150); }
function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/** Chạy hàm này 1 lần trong trình soạn thảo để cấp quyền & tạo Sheet ngay. */
function setup() {
  var secret = PropertiesService.getScriptProperties().getProperty('TRIP_SECRET') || '';
  if (secret.length < 32) Logger.log('⚠️ Chưa đặt TRIP_SECRET (tối thiểu 32 ký tự) trong Project Settings > Script properties.');
  var ss = getSpreadsheet();
  Logger.log('Google Sheet: ' + ss.getUrl());
}
