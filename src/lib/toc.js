// Nội dung bài viết chuẩn SEO:
// - Mục lục "Nội dung chính": gắn id vào các thẻ H2/H3 trong HTML đã lọc và trả về danh sách mục (đánh số 1, 1.1, 2…).
// - Câu hỏi thường gặp (FAQ): tách từ ô FAQ trong Dashboard.
// - Danh sách bố cục / màu nhấn cho bài viết.
const { slugify } = require('./helpers');

const LAYOUTS = {
  classic: { label: 'Cổ điển', hint: 'Đầu trang có video nền, ảnh bìa trên nội dung, cột phải là form tư vấn.' },
  guide: { label: 'Hướng dẫn', hint: 'Mục lục dính bên trái khi cuộn. Hợp với bài dài, nhiều bước.' },
  magazine: { label: 'Tạp chí', hint: 'Ảnh bìa lớn tràn màn hình, tiêu đề trên ảnh, cột đọc hẹp ở giữa.' },
  minimal: { label: 'Tối giản', hint: 'Tiêu đề chữ trên nền sáng, không video, đọc nhanh trên điện thoại.' },
};
const THEMES = { sky: 'Xanh trời (mặc định)', accent: 'Cam TRIP', navy: 'Xanh đậm' };

const decode = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#0*39;/g, "'").replace(/&amp;/g, '&');

// id đã dùng sẵn trên trang (khung trang, popup, mục FAQ): tiêu đề trong bài không được trùng
const RESERVED_IDS = ['main', 'header', 'nav', 'burger', 'tu-van', 'cau-hoi-thuong-gap', 'lead-modal', 'news-modal', 'offer-modal',
  'video-modal', 'video-modal-frame', 'lead-thanks', 'sub-1', 'sub-2', 'sub-3', 'lam-nhanh', 'bang-gia'];

// html: HTML đã qua sanitize-html (thẻ h2/h3 không có thuộc tính)
function buildToc(html) {
  const used = new Set(RESERVED_IDS);
  const items = [];
  let h2 = 0;
  let h3 = 0;
  const out = String(html || '').replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (m, lv, inner) => {
    const text = inner.replace(/<[^>]*>/g, '').trim(); // vẫn ở dạng đã mã hoá HTML -> in ra an toàn
    if (!text) return m;
    let id = slugify(decode(text)) || 'muc';
    if (/^\d/.test(id)) id = `muc-${id}`;
    const baseId = id;
    for (let n = 2; used.has(id); n++) id = `${baseId}-${n}`;
    used.add(id);
    let num;
    if (lv === '2' || h2 === 0) { h2 += 1; h3 = 0; num = String(h2); } else { h3 += 1; num = `${h2}.${h3}`; }
    items.push({ id, text, level: lv === '2' || num.indexOf('.') === -1 ? 2 : 3, num });
    return `<h${lv} id="${id}">${inner}</h${lv}>`;
  });
  return { html: out, toc: items };
}

// Ô FAQ: mỗi câu hỏi một khối, cách nhau bằng 1 dòng trống. Dòng đầu là câu hỏi, các dòng sau là câu trả lời.
// Chấp nhận tiền tố "Hỏi:", "H:", "Q:" và "Đáp:", "Đ:", "A:".
function parseFaq(text) {
  return String(text || '').replace(/\r/g, '').split(/\n\s*\n/).map((block) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return null;
    const q = lines[0].replace(/^(#+\s*|(hỏi|h|q)\s*[:.)-]\s*)/i, '').trim();
    const a = lines.slice(1).join('\n').replace(/^(đáp|đ|a|trả lời)\s*[:.)-]\s*/i, '').trim();
    return q && a ? { q: q.slice(0, 300), a: a.slice(0, 3000) } : null;
  }).filter(Boolean).slice(0, 20);
}

// Chữ thuần từ HTML đã lọc (bỏ thẻ, giải mã ký tự đặc biệt cơ bản)
const htmlText = (html) => decode(String(html || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
// Đếm số chữ trên HTML đã render (không dùng biểu thức phức tạp trên Markdown thô: tránh chậm với nội dung dài)
const wordCount = (html) => { const t = htmlText(html); return t ? t.split(' ').length : 0; };

module.exports = { buildToc, parseFaq, wordCount, htmlText, LAYOUTS, THEMES };
