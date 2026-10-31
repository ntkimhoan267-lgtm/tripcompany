const db = require('../db');

const vnd = (n) => (n == null ? '' : Number(n).toLocaleString('vi-VN').replace(/,/g, '.') + 'đ');
const usd = (n) => (n == null ? '' : '$' + Number(n).toLocaleString('en-US').replace(/,/g, '.'));
const money = (p) => (p == null ? 'Liên hệ' : p.vnd != null ? vnd(p.vnd) : p.usd != null ? usd(p.usd) : vnd(p));

// 0935191394 -> 0935.191.394
const phoneDisplay = (p) => String(p || '').replace(/\D/g, '').replace(/^(\d{4})(\d{3})(\d{3,4})$/, '$1.$2.$3');
const phoneTel = (p) => String(p || '').replace(/[^\d+]/g, '');

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// Ngày giờ SQLite (UTC) -> giờ Việt Nam
function fmtDate(sqlDate, withTime = false) {
  if (!sqlDate) return '';
  const d = new Date(sqlDate.replace(' ', 'T') + 'Z');
  const opts = { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' };
  if (withTime) Object.assign(opts, { hour: '2-digit', minute: '2-digit', hour12: false });
  return d.toLocaleString('vi-VN', opts);
}

let settingsCache = null;
function getSettings() {
  if (!settingsCache) {
    settingsCache = {};
    for (const row of db.prepare('SELECT key, value FROM settings').all()) settingsCache[row.key] = row.value;
  }
  return settingsCache;
}
function setSettings(obj) {
  const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  for (const [k, v] of Object.entries(obj)) stmt.run(k, v == null ? '' : String(v));
  settingsCache = null;
}

// Phân tích link video: file mp4 / YouTube / Google Drive
function parseVideo(url) {
  url = String(url || '').trim();
  if (!url) return null;
  let m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if (m) return { type: 'youtube', id: m[1], embed: `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&mute=1&loop=1&playlist=${m[1]}&controls=1&rel=0&playsinline=1` };
  m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]{10,})/);
  if (m) return { type: 'drive', id: m[1], embed: `https://drive.google.com/file/d/${m[1]}/preview` };
  // File video: đường dẫn nội bộ (/media/...) hoặc link https, chỉ gồm ký tự an toàn
  if (/^(\/[\w\-./]+|https:\/\/[\w\-./%~]+)\.(mp4|webm)$/i.test(url)) return { type: 'file', src: url };
  return null;
}

const isValidVnPhone = (p) => /^(0|\+?84)(3|5|7|8|9)\d{8}$/.test(String(p).replace(/[\s.\-()]/g, ''));
const normalizePhone = (p) => String(p).replace(/[\s.\-()]/g, '').replace(/^\+?84/, '0');
const isValidEmail = (e) => /^[^\s@]{1,64}@[^\s@]{1,255}\.[a-z]{2,}$/i.test(String(e));

// Đường dẫn trang -> tên dễ hiểu cho nhân viên
const PAGE_NAMES = {
  '/': 'Trang chủ', '/visa': 'Visa (tổng quan)', '/visa/trung-quoc': 'Visa Trung Quốc', '/visa/han-quoc': 'Visa Hàn Quốc',
  '/visa/nhat-ban': 'Visa Nhật Bản', '/visa/chau-au': 'Visa Châu Âu', '/visa/nuoc-khac': 'Visa nước khác', '/visa/e-visa': 'E-visa Việt Nam',
  '/dich-vu': 'Dịch vụ', '/dich-vu/dich-thuat': 'Dịch thuật', '/dich-vu/hop-phap-hoa-lanh-su': 'Hợp pháp hoá lãnh sự',
  '/dich-vu/ho-chieu': 'Hộ chiếu', '/dich-vu/ve-may-bay': 'Vé máy bay', '/dich-vu/thue-xe': 'Thuê xe', '/dich-vu/bao-hiem-esim': 'Bảo hiểm & eSIM',
  '/dich-vu/tour': 'Dịch vụ tour', '/bang-gia': 'Bảng giá', '/tour': 'Danh sách tour', '/blog': 'Cẩm nang', '/gioi-thieu': 'Giới thiệu', '/lien-he': 'Liên hệ',
};
function pageName(p) {
  p = String(p || '');
  if (PAGE_NAMES[p]) return PAGE_NAMES[p];
  if (p.startsWith('/tour/')) return 'Tour: ' + p.slice(6);
  if (p.startsWith('/blog/')) return 'Bài viết: ' + p.slice(6);
  return p;
}

module.exports = {
  pageName,
  vnd, usd, money, phoneDisplay, phoneTel, slugify, fmtDate,
  getSettings, setSettings, parseVideo, isValidVnPhone, normalizePhone, isValidEmail,
};
