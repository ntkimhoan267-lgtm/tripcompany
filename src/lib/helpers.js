const db = require('../db');

const vnd = (n) => (n == null ? '' : Number(n).toLocaleString('vi-VN').replace(/,/g, '.') + 'đ');
const usd = (n) => (n == null ? '' : '$' + Number(n).toLocaleString('en-US').replace(/,/g, '.'));
const money = (p) => (p == null ? 'Liên hệ' : p.vnd != null ? vnd(p.vnd) : p.usd != null ? usd(p.usd) : typeof p === 'object' ? 'Liên hệ' : vnd(p));
// Giá thấp nhất trong bảng (giá "từ"); bảng trống / chỉ có giá "Liên hệ" -> null
const minPrice = (rows, key = 'price') => {
  const list = (Array.isArray(rows) ? rows : []).map((r) => r && r[key]).filter((n) => typeof n === 'number' && n > 0);
  return list.length ? Math.min(...list) : null;
};

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

// ---------- Ảnh: WebP nhiều kích cỡ (srcset) ----------
// Bản WebP do scripts/build-images.js sinh sẵn cạnh ảnh gốc: /img/tours/ba-na.jpg -> /img/tours/ba-na-480.webp …
// Ảnh chưa có bản WebP (ảnh admin tải lên, ảnh ngoài) hiển thị bình thường bằng <img>.
const fs = require('node:fs');
const path = require('node:path');
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
const IMAGE_WIDTHS = [480, 800, 1200];
const variantCache = new Map();
function webpVariants(src) {
  if (variantCache.has(src)) return variantCache.get(src);
  let list = [];
  const m = /^\/img\/(?!.*\.\.)([\w/-]+)\.(jpe?g|png)$/i.exec(String(src || ''));
  if (m) {
    const dir = path.posix.dirname(`/img/${m[1]}`); const name = path.posix.basename(m[1]);
    const re = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)\\.webp$`);
    let files = [];
    try { files = fs.readdirSync(path.join(PUBLIC_DIR, dir)); } catch { /* thư mục không có */ }
    list = files.map((f) => re.exec(f)).filter(Boolean)
      .map((x) => ({ url: `${dir}/${x[0]}`, w: Number(x[1]) })).sort((a, b) => a.w - b.w);
  }
  variantCache.set(src, list);
  return list;
}
const escAttr = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Dùng trong EJS: <%- h.picture(src, { alt, width, height, sizes, loading, fetchpriority, cls, style }) %>
function picture(src, o = {}) {
  const attrs = [
    `src="${escAttr(src)}"`, `alt="${escAttr(o.alt || '')}"`,
    o.width ? `width="${Number(o.width)}"` : '', o.height ? `height="${Number(o.height)}"` : '',
    o.cls ? `class="${escAttr(o.cls)}"` : '', o.style ? `style="${escAttr(o.style)}"` : '',
    o.fetchpriority ? `fetchpriority="${escAttr(o.fetchpriority)}"` : `loading="${o.loading === 'eager' ? 'eager' : 'lazy'}"`,
    'decoding="async"',
  ].filter(Boolean).join(' ');
  const img = `<img ${attrs}>`;
  const v = webpVariants(src);
  if (!v.length) return img;
  const sizes = o.sizes || '(max-width: 640px) 100vw, 50vw';
  return `<picture class="pic"><source type="image/webp" srcset="${v.map((x) => `${x.url} ${x.w}w`).join(', ')}" sizes="${escAttr(sizes)}">${img}</picture>`;
}

module.exports = {
  picture, IMAGE_WIDTHS, escAttr,
  pageName,
  vnd, usd, money, minPrice, phoneDisplay, phoneTel, slugify, fmtDate,
  getSettings, setSettings, parseVideo, isValidVnPhone, normalizePhone, isValidEmail,
};
