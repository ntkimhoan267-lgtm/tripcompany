// Ưu đãi "giảm X khi để lại SĐT hoặc Gmail".
// Giá niêm yết trên website = giá thật + X. Khách để lại số điện thoại / email (form tư vấn, form nhận tin hoặc
// popup ưu đãi) thì website gạch giá niêm yết và hiện giá thật. Trạng thái "đã nhận ưu đãi" lưu trong cookie
// trip_offer (máy chủ đọc để hiện sẵn giá ưu đãi) và localStorage (trình duyệt).
const { vnd, usd } = require('./helpers');
const config = require('../config');

const OFFER_COOKIE = 'trip_offer';
const GROUPS = {
  cn: 'Visa Trung Quốc',
  world: 'Visa các nước (Hàn, Nhật, Châu Âu, Mỹ…)',
  markets: 'Giá "trọn gói từ" của 4 thị trường visa',
  evisa: 'E-visa Việt Nam (USD)',
  passport: 'Hộ chiếu (gồm gói làm nhanh có giá)',
  legal: 'Hợp pháp hoá / chứng nhận lãnh sự',
  translation: 'Dịch thuật (giá theo trang)',
  fees: 'Phụ phí công chứng & in ấn',
  cars: 'Xe đưa đón (giá theo chuyến)',
  selfdrive: 'Thuê xe tự lái (giá theo ngày)',
  tours: 'Tour du lịch',
};
// Mặc định: áp dụng cho dịch vụ trọn gói giá cao. Dịch thuật/phụ phí/xe đưa đón (vài chục – vài trăm nghìn) tắt sẵn,
// vì "giảm 500.000đ" trên giá 40.000đ/trang trông thiếu tin cậy; bật được trong Dashboard → Ưu đãi.
const DEFAULT_GROUPS = ['cn', 'world', 'markets', 'passport', 'legal', 'tours'];

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function offerConfig(settings) {
  const groups = settings.offer_groups == null ? DEFAULT_GROUPS : String(settings.offer_groups).split(',').filter((g) => Object.hasOwn(GROUPS, g));
  const amountVnd = Math.max(0, parseInt(settings.offer_vnd, 10) || 0);
  const amountUsd = Math.max(0, parseInt(settings.offer_usd, 10) || 0);
  return {
    enabled: settings.offer_enabled === '1' && (amountVnd > 0 || amountUsd > 0),
    vnd: amountVnd,
    usd: amountUsd,
    groups: new Set(groups),
    label: amountVnd ? `Giảm ${vnd(amountVnd)}` : `Giảm ${usd(amountUsd)}`,
  };
}

const shortVnd = (n) => (n >= 1000 && n % 1000 === 0 ? `${(n / 1000).toLocaleString('vi-VN')}k` : vnd(n));

// Trả về hàm price(amount, cur, group, opts) sinh HTML giá (đã escape).
// opts: suffix ("/trang"), service (dịch vụ gửi kèm khi khách nhận ưu đãi), inLink (giá nằm trong thẻ <a>: không dùng nút), empty ("Liên hệ")
function makePricer(settings) {
  const cfg = offerConfig(settings);
  const price = (amount, cur = 'vnd', group = '', opts = {}) => {
    const suffix = opts.suffix ? esc(opts.suffix) : '';
    if (amount == null || amount === '' || Number.isNaN(Number(amount))) return esc(opts.empty || 'Liên hệ');
    const n = Number(amount);
    const fmt = cur === 'usd' ? usd : vnd;
    const off = cur === 'usd' ? cfg.usd : cfg.vnd;
    if (!cfg.enabled || !off || !cfg.groups.has(group) || n <= 0) return esc(fmt(n)) + suffix;
    const tag = cur === 'usd' ? usd(off) : shortVnd(off);
    const badge = opts.inLink
      ? `<span class="op__tag">−${esc(tag)}</span>`
      : `<button type="button" class="op__btn" data-open-offer${opts.service ? ` data-service="${esc(opts.service)}"` : ''} title="${esc(cfg.label)} khi để lại SĐT hoặc Gmail">🎁 −${esc(tag)}</button>`;
    return `<span class="op"><span class="op__list"><span class="sr-only">Giá niêm yết </span>${esc(fmt(n + off))}${suffix}</span>`
      + `<span class="op__deal"><span class="sr-only">, giá ưu đãi </span>${esc(fmt(n))}${suffix}</span>${badge}</span>`;
  };
  // Giá dạng { vnd } hoặc { usd } (giá "từ" của các thị trường visa)
  price.from = (from, group, opts) => (from && from.vnd != null ? price(from.vnd, 'vnd', group, opts) : price(from && from.usd, 'usd', group, opts));
  // Giá dạng chữ thuần (thẻ mô tả cho Google): đúng con số khách thấy trên trang khi chưa nhận ưu đãi. null = chưa có giá
  price.text = (amount, cur = 'vnd', group = '') => {
    if (amount == null || amount === '' || !(Number(amount) > 0)) return null;
    const n = Number(amount);
    const off = cur === 'usd' ? cfg.usd : cfg.vnd;
    return (cur === 'usd' ? usd : vnd)(cfg.enabled && off && cfg.groups.has(group) ? n + off : n);
  };
  price.fromText = (from, group) => (from && from.vnd != null ? price.text(from.vnd, 'vnd', group) : price.text(from && from.usd, 'usd', group));
  price.cfg = cfg;
  return price;
}

const hasOfferCookie = (req) => /(?:^|;\s*)trip_offer=1(?:;|$)/.test(req.get('cookie') || '');
// Cookie chỉ báo "đã nhận ưu đãi" (không chứa thông tin cá nhân); trình duyệt cần đọc được nên không httpOnly
const setOfferCookie = (res) => res.cookie(OFFER_COOKIE, '1', { maxAge: 180 * 24 * 3600e3, sameSite: 'lax', path: '/', httpOnly: false, secure: config.isProd });

module.exports = { GROUPS, DEFAULT_GROUPS, offerConfig, makePricer, hasOfferCookie, setOfferCookie, OFFER_COOKIE };
