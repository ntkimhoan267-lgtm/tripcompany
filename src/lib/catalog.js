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

// Đường dẫn ảnh hợp lệ (ảnh nội bộ không có '..', hoặc link https tới file ảnh): dùng chung với Ảnh & video
const { SAFE_IMAGE } = require('./media');

const REGIONS = { 'chau-a': 'Châu Á', 'chau-au': 'Châu Âu', 'chau-my': 'Châu Mỹ', 'chau-uc': 'Úc & New Zealand' };
const CURRENCIES = { vnd: 'VNĐ', usd: 'USD' };

// Kiểu ô nhập: text, vnd (số nguyên, trống = Liên hệ), usd, select, image, code (mã cờ 2 chữ)
const T = (k, label, type = 'text', extra = {}) => ({ k, label, type, ...extra });

// Mỗi bảng: id, nhóm (tab trong Dashboard), tiêu đề, cột, cách đọc/ghi vào dữ liệu dịch vụ.
// fixed: không thêm/xoá dòng (chỉ sửa).
const TABLES = [
  {
    id: 'cn', group: 'visa', title: 'Visa Trung Quốc (VNĐ)', offer: 'cn', minRows: 1,
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
        // Giá trống = "Liên hệ"; thời gian / mô tả để trống thì giữ chữ mặc định
        return { ...m, from: r.amount == null ? {} : { [r.cur === 'vnd' ? 'vnd' : 'usd']: r.amount }, time: r.time || m.time, blurb: r.blurb || m.blurb };
      });
    },
  },
  {
    id: 'evisa', group: 'visa', title: 'E-visa Việt Nam (USD)', offer: 'evisa',
    fields: [T('speed', 'Tốc độ xử lý', 'text', { max: 60, required: true }), T('single', '1 lần (USD)', 'num'), T('multiple', 'Nhiều lần (USD)', 'num')],
    get: (s) => s.evisa.rows, set: (s, rows) => { s.evisa.rows = rows; },
  },
  {
    id: 'tr_anh', group: 'translation', minRows: 1, title: 'Dịch thuật Tiếng Anh (VNĐ/trang)', offer: 'translation',
    fields: [T('level', 'Gói dịch', 'text', { max: 120, required: true }), T('price', 'Giá (VNĐ)', 'vnd')],
    get: (s) => lang(s, 'anh').rows, set: (s, rows) => { lang(s, 'anh').rows = rows; },
  },
  {
    id: 'tr_thn', group: 'translation', minRows: 1, title: 'Dịch thuật Trung · Hàn · Nhật (VNĐ/trang)', offer: 'translation',
    fields: [T('level', 'Gói dịch', 'text', { max: 120, required: true }), T('price', 'Giá (VNĐ)', 'vnd')],
    get: (s) => lang(s, 'trung-han-nhat').rows, set: (s, rows) => { lang(s, 'trung-han-nhat').rows = rows; },
  },
  {
    id: 'tr_tl', group: 'translation', minRows: 1, title: 'Dịch thuật Thái · Lào (VNĐ/trang)', offer: 'translation',
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

// Đọc giá người dùng gõ. Trả về { value } (null = để trống = "Liên hệ") hoặc { error }.
// Nhận: 2800000 · 2.800.000 · 2,800,000 · 500k · 2,8tr · 2.8 triệu · (USD) 120 · 12.5 · 12,5
// Không đoán khi không chắc: "abc", "-500000", "0", "1,5" (VNĐ) bị báo lỗi thay vì lưu thành số sai.
function parsePrice(v, cur = 'vnd') {
  const raw = str(v, 40).toLowerCase().replace(/\s+/g, '').replace(/(đ|vnđ|vnd|usd|\$)$/, '').replace(/^\$/, '');
  if (!raw) return { value: null };
  let n = null;
  const unit = /^(\d+(?:[.,]\d+)?)(k|nghìn|ngàn|tr|triệu|m)$/.exec(raw);
  if (unit && cur === 'vnd') {
    n = Number(unit[1].replace(',', '.')) * (unit[2] === 'k' || unit[2] === 'nghìn' || unit[2] === 'ngàn' ? 1e3 : 1e6);
  } else if (/^\d+$/.test(raw) || /^\d{1,3}([.,]\d{3})+$/.test(raw)) {
    n = Number(raw.replace(/[.,]/g, ''));
  } else if (cur === 'usd' && /^\d+[.,]\d{1,2}$/.test(raw)) {
    n = Number(raw.replace(',', '.'));
  }
  if (n == null || !Number.isFinite(n)) return { error: `"${str(v, 30)}" không phải số tiền hợp lệ (VD: 2800000, 2.800.000 hoặc 2,8tr)` };
  if (n <= 0) return { error: 'giá phải lớn hơn 0 (để trống nếu muốn hiện "Liên hệ")' };
  if (cur === 'vnd' && n < 1000) return { error: `${n}đ quá nhỏ, có thể gõ thiếu số 0 (VD: 2800000 hoặc 2,8tr)` };
  return { value: Math.min(cur === 'usd' ? Math.round(n * 100) / 100 : Math.round(n), 1e10) };
}

// Trả về { row } hoặc { error }
function cleanRow(t, r) {
  const out = {};
  for (const f of t.fields) {
    const v = r[f.k];
    if (f.type === 'readonly') continue;
    if (f.type === 'vnd' || f.type === 'num') {
      // Ô "num" đi kèm ô tiền tệ (cur) trong cùng dòng: VNĐ hay USD
      const cur = f.type === 'vnd' ? 'vnd' : (r.cur === 'vnd' ? 'vnd' : 'usd');
      const p = parsePrice(v, cur);
      if (p.error) return { error: `ô "${f.label}": ${p.error}` };
      out[f.k] = p.value;
    } else if (f.type === 'select') out[f.k] = Object.hasOwn(f.options, v) ? v : Object.keys(f.options)[0];
    else if (f.type === 'code') {
      const c = str(v, 5).toLowerCase();
      if (c && !/^[a-z]{2}$/.test(c)) return { error: `ô "${f.label}" cần đúng 2 chữ cái (VD: kr, jp, fr)` };
      out[f.k] = c;
    } else if (f.type === 'image') {
      const p = str(v, 400);
      if (p && !SAFE_IMAGE.test(p)) return { error: `ô "${f.label}" cần là file ảnh .jpg/.png/.webp (bấm "Tải ảnh" hoặc dán link https tới ảnh)` };
      out[f.k] = p;
    } else out[f.k] = str(v, f.max || 200);
  }
  return { row: out };
}

// Trả về { rows } hoặc { error } — bỏ dòng trống, báo lỗi rõ dòng nào, ô nào
function cleanTable(t, rows) {
  if (!Array.isArray(rows)) return { error: `${t.title}: dữ liệu không hợp lệ.` };
  const cleaned = [];
  let line = 0;
  for (const r of rows.slice(0, MAX_ROWS)) {
    if (!r || typeof r !== 'object') continue;
    line += 1;
    const c = cleanRow(t, r);
    if (c.error) return { error: `${t.title}, dòng ${line}: ${c.error}.` };
    const row = c.row;
    const empty = t.fields.every((f) => f.type === 'readonly' || f.type === 'select' || row[f.k] == null || row[f.k] === '');
    if (empty && !t.fixed) continue;
    const missing = t.fields.find((f) => f.required && !row[f.k]);
    if (missing && !t.fixed) return { error: `${t.title}, dòng ${line}: thiếu "${missing.label}".` };
    cleaned.push(row);
  }
  if (t.fixed && cleaned.length !== t.get(cloneData(base)).length) return { error: `${t.title}: số dòng không được thay đổi.` };
  if (t.minRows && cleaned.length < t.minRows) return { error: `${t.title}: cần ít nhất ${t.minRows} dòng (trang chủ và trang dịch vụ dùng giá "từ" của bảng này).` };
  return { rows: cleaned };
}

// Giá trị mặc định (trong services.js) của 1 bảng, đã chuẩn hoá giống dữ liệu gửi lên -> so sánh "có sửa hay không"
const defaultRows = (t) => {
  const s = cloneData(base);
  return t.get(s).map((r) => { const c = cleanRow(t, r); return c.row || r; });
};
const textValue = (x, v) => (x.lines ? String(v ?? '').split(/\r?\n/).map((l) => str(l, 400)).filter(Boolean).slice(0, 20) : str(String(v ?? '').replace(/\r/g, ''), 2000));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// payload: { tables: { id: rows }, texts: { id: string }, reset: [id] }
// Chỉ lưu bảng/đoạn chữ KHÁC giá mặc định: bảng giữ nguyên mặc định vẫn tự cập nhật khi services.js đổi.
function saveOverrides(payload) {
  const o = readOverrides();
  const errors = [];
  const tables = payload && typeof payload.tables === 'object' && payload.tables ? payload.tables : {};
  for (const t of TABLES) {
    if (!Object.hasOwn(tables, t.id)) continue;
    const r = cleanTable(t, tables[t.id]);
    if (r.error) { errors.push(r.error); continue; }
    if (same(r.rows, defaultRows(t))) delete o.tables[t.id];
    else o.tables[t.id] = r.rows;
  }
  const texts = payload && typeof payload.texts === 'object' && payload.texts ? payload.texts : {};
  for (const x of TEXTS) {
    if (!Object.hasOwn(texts, x.id)) continue;
    const v = textValue(x, texts[x.id]);
    const def = textValue(x, x.lines ? (x.get(cloneData(base)) || []).join('\n') : x.get(cloneData(base)));
    if (same(v, def)) delete o.texts[x.id];
    else o.texts[x.id] = v;
  }
  for (const id of Array.isArray(payload && payload.reset) ? payload.reset : []) {
    if (typeof id === 'string') { delete o.tables[id]; delete o.texts[id]; }
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

module.exports = { getServices, saveOverrides, editorData, parsePrice, TABLES, TEXTS, CATALOG_KEY };
