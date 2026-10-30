/**
 * TRIP Website ↔ Google Sheet & Gmail
 * ------------------------------------------------------------
 * - Tự tạo Google Sheet "TRIP Website - Khách hàng" trong Drive (lần đầu chạy).
 * - Ghi khách đăng ký tư vấn vào tab "Tư vấn", email nhận tin vào tab "Đăng ký nhận tin".
 * - Chia sẻ Sheet và gửi email thông báo ngay tới các Gmail trong NOTIFY_EMAILS.
 * - Gửi bản tin tour hàng tháng tới người đăng ký (gọi từ Dashboard website).
 *
 * Cài đặt: xem docs/HUONG-DAN-GOOGLE-SHEET.md
 */

// ======= CẤU HÌNH =======
// Mã bí mật: phải TRÙNG với biến GOOGLE_SCRIPT_SECRET trên website.
var SECRET = 'DOI-MA-BI-MAT-NAY';
// Gmail nhận thông báo + được quyền chỉnh sửa Sheet (dự phòng nếu website không gửi danh sách)
var NOTIFY_EMAILS = ['ntkimhoan267@gmail.com', 'triptranslate.com@gmail.com'];
var SHEET_NAME = 'TRIP Website - Khách hàng';
var TZ = 'Asia/Ho_Chi_Minh';
// =========================

var LEAD_HEADERS = ['Thời gian', 'Họ tên', 'Số điện thoại', 'Dịch vụ', 'Ghi chú của khách', 'Trang nguồn', 'Mã KH (web)', 'Trạng thái'];
var SUB_HEADERS = ['Thời gian', 'Email', 'Tên', 'Trang nguồn', 'Mã (web)'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var req = JSON.parse(e.postData.contents || '{}');
    if (!SECRET || req.secret !== SECRET) return json({ ok: false, error: 'Sai mã bí mật (GOOGLE_SCRIPT_SECRET)' });
    var emails = (req.notifyEmails && req.notifyEmails.length) ? req.notifyEmails : NOTIFY_EMAILS;
    lock.waitLock(20000);

    switch (req.action) {
      case 'ping':
        return json({ ok: true, sheetUrl: getSpreadsheet(emails).getUrl() });
      case 'lead':
        return json(handleLead(req.data, emails, req.siteUrl));
      case 'subscribe':
        return json(handleSubscribe(req.data, emails));
      case 'newsletter':
        lock.releaseLock();
        return json(sendNewsletter(req.data, req.siteUrl));
      default:
        return json({ ok: false, error: 'Hành động không hợp lệ' });
    }
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (x) { /* đã nhả */ }
  }
}

function doGet() {
  return ContentService.createTextOutput('TRIP Apps Script đang hoạt động.');
}

// ---------- Sheet ----------
function getSpreadsheet(emails) {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SHEET_ID');
  var ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create(SHEET_NAME);
    props.setProperty('SHEET_ID', ss.getId());
    var first = ss.getSheets()[0];
    first.setName('Tư vấn');
    setupSheet(first, LEAD_HEADERS, [150, 180, 120, 220, 320, 160, 90, 110]);
    setupSheet(ss.insertSheet('Đăng ký nhận tin'), SUB_HEADERS, [150, 260, 180, 160, 80]);
    props.setProperty('SHARED_WITH', '');
  }
  shareWith(ss, emails);
  return ss;
}

function setupSheet(sheet, headers, widths) {
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#1f3a52').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  widths.forEach(function (w, i) { sheet.setColumnWidth(i + 1, w); });
}

function shareWith(ss, emails) {
  var props = PropertiesService.getScriptProperties();
  var done = (props.getProperty('SHARED_WITH') || '').split(',');
  var me = Session.getEffectiveUser().getEmail();
  emails.forEach(function (em) {
    em = String(em).trim().toLowerCase();
    if (!em || em === me.toLowerCase() || done.indexOf(em) >= 0) return;
    try { ss.addEditor(em); done.push(em); } catch (e) { /* bỏ qua email lỗi */ }
  });
  props.setProperty('SHARED_WITH', done.join(','));
}

function sheetByName(ss, name, headers) {
  return ss.getSheetByName(name) || (function () { var s = ss.insertSheet(name); setupSheet(s, headers, []); return s; })();
}

function now() { return Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm'); }
function safe(v) { v = String(v == null ? '' : v); return /^[=+\-@]/.test(v) ? "'" + v : v; }

// ---------- Khách tư vấn ----------
function handleLead(d, emails, siteUrl) {
  var ss = getSpreadsheet(emails);
  var sheet = sheetByName(ss, 'Tư vấn', LEAD_HEADERS);
  sheet.appendRow([now(), safe(d.name), "'" + String(d.phone || ''), safe(d.service), safe(d.note), safe(d.source_page), d.id, 'Mới']);

  if (!d.resync) {
    var subject = '🔔 Khách mới cần tư vấn: ' + d.name + ' – ' + d.service;
    var html =
      '<div style="font-family:Arial,sans-serif;font-size:15px;color:#1b2b3a">' +
      '<h2 style="color:#1f3a52;margin:0 0 12px">Có khách đăng ký tư vấn trên website TRIP</h2>' +
      '<table cellpadding="8" style="border-collapse:collapse;background:#f4f8fb;border-radius:8px">' +
      row('Họ tên', d.name) +
      row('Số điện thoại', '<a href="tel:' + d.phone + '" style="font-size:18px;font-weight:bold;color:#e0602f">' + esc(d.phone) + '</a>') +
      row('Dịch vụ', d.service) +
      row('Ghi chú', d.note || '—') +
      row('Trang', d.source_page || '/') +
      row('Thời gian', now()) +
      '</table>' +
      '<p style="margin-top:16px"><a href="https://zalo.me/' + d.phone + '" style="background:#0068ff;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Nhắn Zalo cho khách</a> ' +
      '&nbsp;<a href="' + ss.getUrl() + '">Mở Google Sheet</a>' + (siteUrl ? ' · <a href="' + siteUrl + '/admin/leads">Mở Dashboard</a>' : '') + '</p></div>';
    MailApp.sendEmail({ to: emails.join(','), subject: subject, htmlBody: html, name: 'Website TRIP' });
  }
  return { ok: true };
}

// ---------- Đăng ký nhận tin ----------
function handleSubscribe(d, emails) {
  var ss = getSpreadsheet(emails);
  var sheet = sheetByName(ss, 'Đăng ký nhận tin', SUB_HEADERS);
  sheet.appendRow([now(), safe(d.email), safe(d.name), safe(d.source_page), d.id]);
  if (!d.resync) {
    MailApp.sendEmail({
      to: emails.join(','),
      subject: '📩 Đăng ký nhận tin mới: ' + d.email,
      htmlBody: '<p style="font-family:Arial,sans-serif">Email <b>' + esc(d.email) + '</b>' + (d.name ? ' (' + esc(d.name) + ')' : '') +
        ' vừa đăng ký nhận bản tin tour hàng tháng trên website TRIP.</p><p><a href="' + ss.getUrl() + '">Mở Google Sheet</a></p>',
      name: 'Website TRIP',
    });
  }
  return { ok: true };
}

// ---------- Bản tin tháng ----------
function sendNewsletter(d, siteUrl) {
  var remaining = MailApp.getRemainingDailyQuota();
  var list = d.recipients || [];
  if (remaining < list.length) {
    return { ok: false, error: 'Hạn mức Gmail hôm nay còn ' + remaining + ' email, cần ' + list.length + '. Vui lòng gửi lại vào ngày mai.' };
  }
  var sent = 0;
  list.forEach(function (r) {
    var unsub = r.token ? siteUrl + '/huy-dang-ky?token=' + r.token : siteUrl;
    MailApp.sendEmail({
      to: r.email,
      subject: d.subject,
      htmlBody: newsletterHtml(d, siteUrl, unsub),
      name: 'TRIP Đà Nẵng',
    });
    sent++;
  });
  return { ok: true, sent: sent };
}

function newsletterHtml(d, siteUrl, unsub) {
  var body = esc(d.body).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
  var tours = (d.tours || []).map(function (t) {
    return '<tr><td style="padding:0 0 14px">' +
      '<a href="' + t.url + '" style="display:block;text-decoration:none;color:#1b2b3a;border:1px solid #e3ebf2;border-radius:12px;overflow:hidden">' +
      (t.image ? '<img src="' + t.image + '" width="100%" style="display:block;max-height:220px;object-fit:cover" alt="">' : '') +
      '<div style="padding:14px 16px"><div style="font-weight:bold;font-size:16px;color:#1f3a52">' + esc(t.title) + '</div>' +
      '<div style="color:#5b6b7b;font-size:13px;margin:4px 0">' + esc(t.duration || '') + (t.departure ? ' · Khởi hành ' + esc(t.departure) : '') + '</div>' +
      '<div style="color:#e0602f;font-weight:bold">' + (t.price ? 'Giá từ ' + Number(t.price).toLocaleString('vi-VN') + 'đ' : 'Liên hệ để nhận giá') + '</div></div></a></td></tr>';
  }).join('');
  return '<div style="background:#f4f8fb;padding:24px 12px;font-family:Arial,sans-serif">' +
    '<table width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden" cellpadding="0" cellspacing="0">' +
    '<tr><td style="background:#1f3a52;padding:20px 24px"><img src="' + siteUrl + '/img/logo-horizontal.png" height="40" alt="TRIP"></td></tr>' +
    '<tr><td style="padding:24px;font-size:15px;line-height:1.6;color:#1b2b3a">' + body + '</td></tr>' +
    (tours ? '<tr><td style="padding:0 24px"><table width="100%" cellpadding="0" cellspacing="0">' + tours + '</table></td></tr>' : '') +
    '<tr><td style="padding:8px 24px 24px"><a href="' + siteUrl + '/tour" style="display:inline-block;background:#f2784b;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">Xem tất cả tour</a></td></tr>' +
    '<tr><td style="padding:16px 24px;background:#f4f8fb;font-size:12px;color:#5b6b7b">TRIP – Phòng 406, Tầng 4, 35 Cao Thắng, Hải Châu, Đà Nẵng<br>' +
    'Bạn nhận email này vì đã đăng ký nhận tin trên ' + siteUrl.replace(/^https?:\/\//, '') + '. <a href="' + unsub + '" style="color:#5b6b7b">Huỷ đăng ký</a></td></tr>' +
    '</table></div>';
}

// ---------- Tiện ích ----------
function row(k, v) { return '<tr><td style="color:#5b6b7b;white-space:nowrap">' + k + '</td><td><b>' + (String(v).indexOf('<a ') === 0 ? v : esc(v)) + '</b></td></tr>'; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/** Chạy hàm này 1 lần trong trình soạn thảo để cấp quyền & tạo Sheet ngay. */
function setup() {
  var ss = getSpreadsheet(NOTIFY_EMAILS);
  Logger.log('Google Sheet: ' + ss.getUrl());
}
