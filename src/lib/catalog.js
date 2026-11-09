// Bảng giá & dữ liệu dịch vụ sửa được trong Dashboard.
// - Giá mặc định nằm trong src/data/services.js.
// - Khi chủ website sửa trong Dashboard → Bảng giá, phần đã sửa được lưu (JSON) vào bảng settings, khoá CATALOG_KEY,
//   và ĐÈ lên giá mặc định. Bảng nào chưa sửa thì vẫn dùng giá trong services.js.
const base = require('../data/services');
const { getSettings, setSettings } = require('./helpers');

const CATALOG_KEY = 'catalog_v1';
// Sao chép sâu dữ liệu thuần (chuỗi, số, mảng, đối tượng); bỏ qua hàm tiện ích
const cloneData = (v) => JSON.parse(JSON.stringify(v));
const MAX_ROWS = 80;

// Đường dẫn ảnh hợp lệ: ảnh nội bộ (không có '..') hoặc link https
const SAFE_MEDIA = /^(\/(uploads|img|media)\/(?!.*\.\.)[\w./-]+|https:\/\/[^\s"'<>()]+)$/;

const REGIONS = { 'chau-a': 'Châu Á', 'chau-au': 'Châu Âu', 'chau-my': 'Châu Mỹ', 'chau-uc': 'Úc & New Zealand' };
const CURRENCIES = { vnd: 'VNĐ', usd: 'USD' };

// Kiểu ô nhập: text, vnd (số nguyên, trống = Liên hệ), usd, select, image, code (mã cờ 2 chữ)
const T = (k, label, type = 'text', extra = {}) => ({ k, label, type, ...extra });

// Mỗi bảng: id, nhóm (tab trong Dashboard), tiêu đề, cột, cách đọc/ghi vào dữ liệu dịch vụ.
// fixed: không thêm/xoá dòng (chỉ sửa).
const TABLES = [
  {
    id: 'cn', group: 'visa', title: 'Visa Trung Quốc (VNĐ)', offer: 'cn',
    fields: [T('type', 'Loại visa', 'text', { max: 120, required: true }), T('detail', 'Chi tiết', 'text', { max: 120 }), T('time', 'Thời gian', 'text', { max: 60 }), T('price', 'Giá (VNĐ)', 'vnd')],
    get: (s) => s.chinaVisa.rows, set: (s, rows) => { s.chinaVisa.rows = rows; },
  },
  {
    id: 'world', group: 'visa', title: 'Visa các nước', offer: 'world',
    fields: [
      T('country', 'Quốc gia', 'text', { max: 60, required: true }), T('code', 'Mã cờ', 'code'),
      T('region', 'Khu vực', 'select', { options: REGIONS }), T('type', 'Loại visa', 'text', { max: 120, required: true }),
      T('time', 'Thời gian', 'text', { max: 60 }), T('cur', 'Tiền tệ', 'select', { options: CURRENCIES }), T('amount', 'Giá', 'num'),
      T('note', 'Ghi chú', 'text', { max: 120 }),
    ],
    // Dữ liệu gốc lưu { usd } hoặc { vnd }; trong Dashboard tách thành "Tiền tệ" + "Giá"
    get: (s) => s.worldVisa.map((v) => ({ ...v, cur: v.vnd != null ? 'vnd' : 'usd', amount: v.vnd != null ? v.vnd : v.usd })),
    set: (s, rows) => {
      s.worldVisa = rows.map(({ cur, amount, ...r }) => ({ ...r, [cur === 'vnd' ? 'vnd' : 'usd']: amount }));
    },
  },
  {
    id: 'markets', group: 'visa', title: 'Giá "trọn gói từ" của 4 thị trường (trang chủ, trang Visa)', fixed: true, offer: 'markets',
    fields: [T('country', 'Thị trường', 'readonly'), T('cur', 'Tiền tệ', 'select', { options: CURRENCIES }), T('amount', 'Giá từ', 'num'), T('time', 'Thời gian xét duyệt', 'text', { max: 60 }), T('blurb', 'Mô tả ngắn', 'text', { max: 200 })],
    get: (s) => s.markets.map((m) => ({ id: m.id, country: m.country, cur: m.from.vnd != null ? 'vnd' : 'usd', amount: m.from.vnd != null ? m.from.vnd : m.from.usd, time: m.time, blurb: m.blurb })),
    set: (s, rows) => {
      s.markets = s.markets.map((m, i) => {
        const r = rows[i];
        if (!r) return m;
        return { ...m, from: r.amount == null ? m.from : { [r.cur === 'vnd' ? 'vnd' : 'usd']: r.amount }, time: r.time || m.time, blurb: r.blurb || m.blurb };
      });
    },
  },
  {
    id: 'evisa', group: 'visa', title: 'E-visa Việt Nam (USD)', offer: 'evisa',
    fields: [T('speed', 'Tốc độ xử lý', 'text', { max: 60, required: true }), T('single', '1 lần (USD)', 'num'), T('multiple', 'Nhiều lần (USD)', 'num')],
    get: (s) => s.evisa.rows, set: (s, rows) => { s.evisa.rows = rows; },
  },
  {
    id: 'tr_anh', group: 'translation', title: 'Dịch thuật Tiếng Anh (VNĐ/trang)', offer: 'translation',
    fields: [T('level', 'Gói dịch', 'text', { max: 120, required: true }), T('price', 'Giá (VNĐ)', 'vnd')],
    get: (s) => lang(s, 'anh').rows, set: (s, rows) => { lang(s, 'anh').rows = rows; },
  },
  {
    id: 'tr_thn', group: 'translation', title: 'Dịch thuật Trung · Hàn · Nhật (VNĐ/trang)', offer: 'translation',
    fields: [T('level', 'Gói dịch', 'text', { max: 120, required: true }), T('price', 'Giá (VNĐ)', 'vnd')],
    get: (s) => lang(s, 'trung-han-nhat').rows, set: (s, rows) => { lang(s, 'trung-han-nhat').rows = rows; },
  },
  {
    id: 'tr_tl', group: 'translation', title: 'Dịch thuật Thái · Lào (VNĐ/trang)', offer: 'translation',
    fields: [T('level', 'Gói dịch', 'text', { max: 120, required: true }), T('price', 'Giá (VNĐ)', 'vnd')],
    get: (s) => lang(s, 'thai-lao').rows, set: (s, rows) => { lang(s, 'thai-lao').rows = rows; },
  },
  {
    id: 'fees', group: 'translation', title: 'Phụ phí công chứng & in ấn', offer: 'fees',
    fields: [T('name', 'Hạng mục', 'text', { max: 120, required: true }), T('unit', 'Đơn vị', 'text', { max: 40 }), T('price', 'Giá (VNĐ)', 'vnd')],
    get: (s) => s.translation.surcharges, set: (s, rows) => { s.translation.surcharges = rows; },
  },
  {
    id: 'legal', group: 'translation', title: 'Hợp pháp hoá / Chứng nhận lãnh sự', offer: 'legal',
    fields: [T('name', 'Dịch vụ', 'text', { max: 160, required: true }), T('detail', 'Chi tiết', 'text', { max: 160 }), T('price', 'Giá (VNĐ)', 'vnd')],
    get: (s) => s.translation.legalization, set: (s, rows) => { s.translation.legalization = rows; },
  },
  {
    id: 'passport', group: 'passport', title: 'Hộ chiếu (thường)', offer: 'passport',
    fields: [T('type', 'Loại', 'text', { max: 120, required: true }), T('time', 'Thời gian', 'text', { max: 60 }), T('price', 'Giá (VNĐ)', 'vnd')],
    get: (s) => s.passport.rows, set: (s, rows) => { s.passport.rows = rows; },
  },
  {
    id: 'passport_express', group: 'passport', title: 'Hộ chiếu làm nhanh (để trống giá = "Liên hệ tư vấn")', offer: 'passport',
    fields: [T('label', 'Gói', 'text', { max: 80, required: true }), T('time', 'Thời gian', 'text', { max: 60 }), T('price', 'Giá (VNĐ)', 'vnd')],
    get: (s) => s.passport.express, set: (s, rows) => { s.passport.express = rows; },
  },
  {
    id: 'cars', group: 'cars', title: 'Xe đưa đón (giá trọn chuyến, VNĐ)', offer: 'cars',
    fields: [
      T('route', 'Tuyến', 'text', { max: 120, required: true }), T('way', 'Chiều', 'text', { max: 30 }),
      T('p4', 'Xe 4 chỗ', 'vnd'), T('p7', 'Xe 7 chỗ', 'vnd'), T('p16', 'Xe 16 chỗ', 'vnd'), T('image', 'Ảnh', 'image'),
    ],
    get: (s) => s.carTransfer.rows, set: (s, rows) => { s.carTransfer.rows = rows; },
  },
  {
    id: 'selfdrive', group: 'cars', title: 'Thuê xe tự lái (VNĐ/ngày)', offer: 'selfdrive',
    fields: [T('car', 'Mẫu xe', 'text', { max: 80, required: true }), T('seats', 'Số chỗ', 'text', { max: 30 }), T('price', 'Giá/ngày (VNĐ)', 'vnd'), T('image', 'Ảnh', 'image')],
    get: (s) => s.carTransfer.selfDrive, set: (s, rows) => { s.carTransfer.selfDrive = rows; },
  },
];
const lang = (s, id) => s.translation.languages.find((l) => l.id === id);

// Đoạn chữ sửa được (ghi chú dưới bảng giá). lines: mỗi dòng 1 ý.
const TEXTS = [
  { id: 'cn_note', group: 'visa', label: 'Ghi chú dưới bảng visa Trung Quốc', get: (s) => s.chinaVisa.note, set: (s, v) => { s.chinaVisa.note = v; } },
  { id: 'evisa_note', group: 'visa', label: 'Ghi chú E-visa', get: (s) => s.evisa.note, set: (s, v) => { s.evisa.note = v; } },
  { id: 'tr_notes', group: 'translation', label: 'Ghi chú bảng giá dịch thuật (mỗi dòng 1 ý)', lines: true, get: (s) => s.translation.notes, set: (s, v) => { s.translation.notes = v; } },
  { id: 'passport_notes', group: 'passport', label: 'Ghi chú hộ chiếu (mỗi dòng 1 ý)', lines: true, get: (s) => s.passport.notes, set: (s, v) => { s.passport.notes = v; } },
  { id: 'passport_express_note', group: 'passport', label: 'Ghi chú làm hộ chiếu nhanh', get: (s) => s.passport.expressNote, set: (s, v) => { s.passport.expressNote = v; } },
  { id: 'cars_area', group: 'cars', label: 'Khu vực phục vụ', get: (s) => s.carTransfer.area, set: (s, v) => { s.carTransfer.area = v; } },
  { id: 'cars_notes', group: 'cars', label: 'Ghi chú xe (mỗi dòng 1 ý)', lines: true, get: (s) => s.carTransfer.notes, set: (s, v) => { s.carTransfer.notes = v; } },
];

const GROUPS = { visa: 'Visa', translation: 'Dịch thuật & hợp pháp hoá', passport: 'Hộ chiếu', cars: 'Xe đưa đón & thuê xe' };

function readOverrides(settings = getSettings()) {
  try {
    const o = JSON.parse(settings[CATALOG_KEY] || '{}');
    return o && typeof o === 'object' ? { tables: o.tables || {}, texts: o.texts || {} } : { tables: {}, texts: {} };
  } catch { return { tables: {}, texts: {} }; }
}

// Dữ liệu dịch vụ đang dùng (mặc định + phần đã sửa). Ghi nhớ theo bản settings hiện tại (settings đổi -> tính lại).
let memo = { ref: null, value: null };
function getServices() {
  const settings = getSettings();
  if (memo.ref === settings && memo.value) return memo.value;
  const s = cloneData(base);
  // Bản sao JSON bỏ qua hàm: gắn lại hàm tiện ích
  s.visaListFor = base.visaListFor;
  const o = readOverrides(settings);
  for (const t of TABLES) if (Array.isArray(o.tables[t.id])) { try { t.set(s, cloneData(o.tables[t.id])); } catch (e) { console.warn('[catalog]', t.id, e.message); } }
  for (const x of TEXTS) if (Object.hasOwn(o.texts, x.id)) x.set(s, o.texts[x.id]);
  memo = { ref: settings, value: s };
  return s;
}

// ----- Kiểm tra dữ liệu gửi lên từ Dashboard -----
const str = (v, max) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
function num(v, { int = true, max = 1e10 } = {}) {
  const raw = str(v, 30).replace(/\s/g, '');
  if (!raw) return null;
  // "2.800.000" / "2,800,000" -> 2800000 (dấu chấm/phẩy ngăn cách hàng nghìn); USD cho phép số lẻ "12.5" / "12,5"
  const thousands = /^\d{1,3}([.,]\d{3})+$/.test(raw);
  const cleaned = int || thousands ? raw.replace(/[.,]/g, '') : raw.replace(/,/g, '.');
  const n = Number(cleaned.replace(/[^\d.]/g, ''));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(int ? Math.round(n) : Math.round(n * 100) / 100, max);
}

function cleanRow(t, r) {
  const out = {};
  for (const f of t.fields) {
    const v = r[f.k];
    if (f.type === 'readonly') continue;
    if (f.type === 'vnd') out[f.k] = num(v);
    else if (f.type === 'num') out[f.k] = num(v, { int: false, max: 1e10 });
    else if (f.type === 'select') out[f.k] = Object.hasOwn(f.options, v) ? v : Object.keys(f.options)[0];
    else if (f.type === 'code') out[f.k] = /^[a-z]{2}$/.test(str(v, 2).toLowerCase()) ? str(v, 2).toLowerCase() : '';
    else if (f.type === 'image') { const p = str(v, 400); out[f.k] = SAFE_MEDIA.test(p) ? p : ''; }
    else out[f.k] = str(v, f.max || 200);
  }
  return out;
}

// Trả về { rows, error } — bỏ dòng trống, báo lỗi nếu thiếu ô bắt buộc
function cleanTable(t, rows) {
  if (!Array.isArray(rows)) return { error: 'Dữ liệu không hợp lệ.' };
  const cleaned = [];
  for (const r of rows.slice(0, MAX_ROWS)) {
    if (!r || typeof r !== 'object') continue;
    const c = cleanRow(t, r);
    const empty = t.fields.every((f) => f.type === 'readonly' || f.type === 'select' || c[f.k] == null || c[f.k] === '');
    if (empty && !t.fixed) continue;
    const missing = t.fields.find((f) => f.required && !c[f.k]);
    if (missing && !t.fixed) return { error: `${t.title}: dòng ${cleaned.length + 1} thiếu "${missing.label}".` };
    cleaned.push(c);
  }
  if (t.fixed) {
    const current = t.get(cloneData(base));
    if (cleaned.length !== current.length) return { error: `${t.title}: số dòng không được thay đổi.` };
  }
  return { rows: cleaned };
}

// payload: { tables: { id: rows }, texts: { id: string }, reset: [id] }
function saveOverrides(payload) {
  const o = readOverrides();
  const errors = [];
  const tables = payload && typeof payload.tables === 'object' && payload.tables ? payload.tables : {};
  for (const t of TABLES) {
    if (!Object.hasOwn(tables, t.id)) continue;
    const r = cleanTable(t, tables[t.id]);
    if (r.error) { errors.push(r.error); continue; }
    // Bảng "markets" lưu theo dạng { cur, amount }; các bảng khác lưu đúng dạng dữ liệu (đã tách tiền tệ ở world)
    o.tables[t.id] = r.rows;
  }
  const texts = payload && typeof payload.texts === 'object' && payload.texts ? payload.texts : {};
  for (const x of TEXTS) {
    if (!Object.hasOwn(texts, x.id)) continue;
    const v = str(String(texts[x.id] ?? '').replace(/\r/g, ''), 2000);
    o.texts[x.id] = x.lines ? String(texts[x.id] ?? '').split(/\r?\n/).map((l) => str(l, 400)).filter(Boolean).slice(0, 20) : v;
  }
  for (const id of Array.isArray(payload && payload.reset) ? payload.reset : []) {
    delete o.tables[id]; delete o.texts[id];
  }
  setSettings({ [CATALOG_KEY]: JSON.stringify(o) });
  return { errors };
}

// Dữ liệu cho trang Dashboard: giá trị hiện tại của từng bảng/đoạn chữ + đã sửa hay chưa
function editorData() {
  const s = getServices();
  const o = readOverrides();
  return {
    groups: GROUPS,
    tables: TABLES.map((t) => ({ id: t.id, group: t.group, title: t.title, fixed: Boolean(t.fixed), fields: t.fields, rows: t.get(s), edited: Object.hasOwn(o.tables, t.id) })),
    texts: TEXTS.map((x) => ({ id: x.id, group: x.group, label: x.label, lines: Boolean(x.lines), value: x.lines ? (x.get(s) || []).join('\n') : x.get(s) || '', edited: Object.hasOwn(o.texts, x.id) })),
  };
}

module.exports = { getServices, saveOverrides, editorData, TABLES, TEXTS, CATALOG_KEY, SAFE_MEDIA };
