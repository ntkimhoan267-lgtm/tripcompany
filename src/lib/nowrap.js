// Tiếng Việt viết tách từng âm tiết nên trình duyệt có thể ngắt dòng giữa một từ ghép ("chuyên | nghiệp").
// Hàm này nối các từ ghép thường gặp và "số + đơn vị" bằng khoảng trắng không ngắt (U+00A0),
// chỉ trong phần chữ hiển thị của HTML (bỏ qua thẻ, thuộc tính, script, style, textarea, pre, title, code, option, noscript).
const WORDS = `
chuyên nghiệp|dịch thuật|dịch vụ|công chứng|hộ chiếu|hồ sơ|du lịch|tư vấn|miễn phí|trọn gói|lãnh sự|đại sứ|sứ quán|hợp pháp|pháp hoá|chứng nhận
Đà Nẵng|Trung Quốc|Hàn Quốc|Nhật Bản|Châu Âu|Châu Á|Châu Mỹ|Việt Nam|Hội An|Bà Nà|Phú Quốc|Cù Lao|Lao Chàm|Hải Châu|Cao Thắng|Thái Lan|Hoa Kỳ|Ấn Độ|Đài Loan|Hồng Kông|New Zealand|Tây Ban|Ban Nha|Thuỵ Sĩ|Vương quốc|quốc Anh|Bắc Kinh|Phú Sĩ|Vạn Lý|Lý Trường|Trường Thành|Tử Cấm|Cấm Thành|Cầu Vàng|Sơn Trà|Ngũ Hành|Hành Sơn|Bảy Mẫu|Thiên Mụ|Nam Hội|Thần Tài
giấy tờ|tài liệu|ngôn ngữ|bản dịch|biên dịch|hiệu đính|thời gian|xét duyệt|làm việc|nhập cảnh|lưu trú|nhiều lần|thăm thân|thương mại|du học|kết hôn|phỏng vấn|tài chính|công việc|chứng minh|khách hàng|khách sạn|khách lẻ|máy bay|vé tàu|đưa đón|tự lái|bảo hiểm|đặt vé|đặt lịch|lịch hẹn|khởi hành|hành trình|chuyến đi|điểm đến|văn phòng|liên hệ|đăng ký|nhận tin|bản tin|giới thiệu|đánh giá|cẩm nang|kinh nghiệm|bảng giá|báo giá|chi phí|phụ phí|bao gồm|quy trình|nhanh chóng|nhanh gọn|chính xác|minh bạch|tận tâm|đội ngũ|nhân viên|chuyên viên|đồng hành|thế mạnh|nổi bật|hỗ trợ|cung cấp|thủ tục|kiểm tra|chuẩn bị|sân bay|học sinh|sinh viên|hoả tốc|tiêu chuẩn|phổ thông|quốc tịch|quốc gia|lãnh thổ|nước ngoài|xuất ngoại|giấc mơ|hiện thực|tỉ lệ|gia hạn|lần đầu|phố cổ|thành phố|trung tâm|ngân hàng|tiết kiệm|sao kê|hợp đồng|lao động|căn cước|công dân|khai sinh|độc thân|bằng cấp|bảng điểm|học bạ|lý lịch|tư pháp|định cư|xin việc|yên tâm|lên đường|vui chơi|thông tin|điện thoại|họ tên|ghi chú|mỗi tháng|cập nhật|ưu đãi|tiếng Anh|tiếng Trung|tiếng Hàn|tiếng Nhật|công ty|doanh nghiệp|mã số|số thuế|địa chỉ|giờ làm|thứ Bảy|chủ nhật|trang chủ|xem thêm|chi tiết|tất cả|phù hợp|yêu cầu|hình thức|chuyển phát|bàn giao|hướng dẫn|lịch trình|vé máy|cơ bản|khu vực|ngoại ô|tối đa|tối thiểu|dấu tư|dấu công|tem đỏ|kinh tế|học thuật|dân sự|xác nhận
`.trim().split(/[|\n]/).map((w) => w.trim()).filter(Boolean);

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Mỗi từ ghép "A B": chỉ thay khoảng trắng sau A khi B đứng ngay sau (B chỉ dò, không bị "ăn"),
// nhờ vậy các từ chồng nhau như "Ngũ Hành" + "Hành Sơn" đều được nối trong 1 lượt.
const COMPOUND = new RegExp(`(?<![\\p{L}\\p{M}])(?:${WORDS.map((w) => {
  const [a, ...rest] = w.split(' ');
  return `${esc(a)}[ ](?=${rest.map(esc).join('[ \\u00a0]')}(?![\\p{L}\\p{M}]))`;
}).join('|')})`, 'giu');
const NUM_UNIT = /(?<![\d.,])(\d[\d.,]{0,30})[ ](?=[\p{L}%$đ])/gu; // "10 ngày", "5 năm", "4 chỗ"

function fixText(t) {
  if (!/\p{L}/u.test(t)) return t;
  return t.normalize('NFC').replace(COMPOUND, (m) => m.slice(0, -1) + ' ').replace(NUM_UNIT, '$1 ');
}

module.exports = function nowrap(html) {
  // Tách thành: khối bỏ qua (script/style/textarea/pre), thẻ HTML, và phần chữ
  const re = /<(script|style|textarea|pre|title|code|option|noscript)\b[\s\S]*?<\/\1>|<!--[\s\S]*?-->|<(?:"[^"]*"|'[^']*'|[^'">])+>|[^<]+/gi;
  return html.replace(re, (part) => (part[0] === '<' ? part : fixText(part)));
};
module.exports.fixText = fixText;
