const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');
const config = require('./config');
const company = require('./data/company');

const DEFAULT_SETTINGS = {
  hotline: company.hotlines[0].phone,
  hotline_translation: company.hotlines[1].phone,
  zalo: company.hotlines[0].phone,
  facebook: company.facebook,
  messenger: 'https://m.me/triptranslate',
  email: company.email,
  // Video giới thiệu đầy đủ (phát khi bấm "Xem video"): file mp4, link YouTube hoặc link Google Drive
  hero_video: '/media/trip-intro.mp4',
  // Đoạn video ngắn không tiếng, tự chạy lặp trong khung cửa sổ máy bay ở trang chủ
  hero_teaser: '/media/trip-teaser.mp4',
  popup_newsletter_enabled: '1',
  popup_newsletter_delay: '45',
};

const POSTS = [
  {
    slug: 'thu-tuc-xin-visa-trung-quoc-can-chuan-bi-gi',
    title: 'Thủ tục xin visa Trung Quốc: cần chuẩn bị những gì?',
    category: 'Visa',
    excerpt: 'Tổng hợp giấy tờ cơ bản, các loại visa Trung Quốc phổ biến và những lưu ý giúp hồ sơ của bạn được xét duyệt suôn sẻ.',
    content: `Trung Quốc là một trong những điểm đến được người Việt lựa chọn nhiều nhất. Để chuyến đi thuận lợi, bước đầu tiên là chuẩn bị bộ hồ sơ visa đúng và đủ.

## Các loại visa Trung Quốc phổ biến

- **Visa du lịch (L):** dành cho mục đích tham quan, du lịch. Thời gian lưu trú thường 15 hoặc 30 ngày.
- **Visa thăm thân (Q1, Q2, S1, S2):** dành cho người có thân nhân đang sinh sống, làm việc tại Trung Quốc.
- **Visa thương mại (M):** dành cho mục đích công tác, gặp gỡ đối tác, hội chợ.
- **Visa du học (X1, X2):** dành cho học sinh, sinh viên.

## Giấy tờ cơ bản cần chuẩn bị

1. Hộ chiếu bản gốc còn hạn tối thiểu 6 tháng, còn trang trống.
2. Ảnh thẻ nền trắng theo quy cách của Lãnh sự quán.
3. Bản sao CCCD.
4. Giấy tờ chứng minh công việc và tài chính (tuỳ trường hợp).
5. Giấy tờ theo mục đích chuyến đi: lịch trình, thư mời, giấy tờ thân nhân…

> Mỗi hồ sơ có yêu cầu riêng tuỳ nghề nghiệp, mục đích và lịch sử du lịch. Hãy liên hệ TRIP để được kiểm tra hồ sơ miễn phí trước khi nộp.

## Thời gian xét duyệt

Thời gian xét duyệt thông thường khoảng **10–14 ngày làm việc**. Nếu cần gấp, bạn có thể đăng ký xét duyệt nhanh (Express) với phụ phí.

## Vì sao nên làm visa qua TRIP?

- Tư vấn đúng loại visa, tránh sai mục đích dẫn đến bị từ chối.
- Hỗ trợ dịch thuật, công chứng giấy tờ ngay tại văn phòng.
- Theo dõi hồ sơ và thông báo kết quả nhanh chóng.`,
  },
  {
    slug: 'dich-thuat-cong-chung-dau-cong-ty-hay-dau-tu-phap',
    title: 'Dịch thuật công chứng: nên chọn dấu công ty hay dấu tư pháp?',
    category: 'Dịch thuật',
    excerpt: 'Hai hình thức xác nhận bản dịch phổ biến nhất — khác nhau thế nào và khi nào cần dùng loại nào?',
    content: `Khi nộp hồ sơ visa, du học hay giấy tờ cho cơ quan nước ngoài, bạn thường được yêu cầu "bản dịch công chứng". Nhưng công chứng bằng **dấu công ty** hay **dấu tư pháp** lại là câu hỏi khiến nhiều người bối rối.

## Dịch thuật công chứng dấu công ty

Bản dịch được đóng dấu xác nhận của công ty dịch thuật. Hình thức này:

- Nhanh, chi phí thấp hơn.
- Thường được chấp nhận cho nhiều hồ sơ visa du lịch, hồ sơ nội bộ doanh nghiệp, tài liệu tham khảo.

## Dịch thuật công chứng dấu tư pháp

Bản dịch được Phòng Tư pháp hoặc Văn phòng công chứng chứng thực chữ ký người dịch. Hình thức này:

- Có giá trị pháp lý cao hơn.
- Thường bắt buộc với hồ sơ nộp cho cơ quan nhà nước, hồ sơ du học, định cư, kết hôn có yếu tố nước ngoài.

## Nên chọn loại nào?

Câu trả lời phụ thuộc vào **yêu cầu của nơi nhận hồ sơ**. Trước khi dịch, hãy hỏi rõ đơn vị tiếp nhận hoặc gửi yêu cầu cho TRIP — chúng tôi sẽ tư vấn đúng hình thức để bạn không phải dịch lại lần hai.

## Bảng giá tham khảo

Xem chi tiết tại trang [Bảng giá dịch thuật](/dich-vu/dich-thuat).`,
  },
  {
    slug: 'kinh-nghiem-phong-van-visa-my',
    title: 'Kinh nghiệm phỏng vấn visa Mỹ: 7 điều cần nhớ',
    category: 'Visa',
    excerpt: 'Buổi phỏng vấn chỉ kéo dài vài phút nhưng quyết định kết quả hồ sơ. Đây là những điều bạn nên chuẩn bị.',
    content: `Phỏng vấn là bước quan trọng nhất khi xin visa du lịch – công tác Mỹ (B1/B2). Dưới đây là những kinh nghiệm giúp bạn tự tin hơn.

## 1. Hiểu rõ hồ sơ của chính mình
Thông tin bạn trả lời phải khớp với đơn DS-160. Hãy đọc lại đơn trước ngày phỏng vấn.

## 2. Trả lời ngắn gọn, trung thực
Viên chức lãnh sự đánh giá sự rõ ràng và nhất quán. Không học thuộc câu trả lời một cách máy móc.

## 3. Chứng minh ràng buộc tại Việt Nam
Công việc ổn định, gia đình, tài sản… là những yếu tố cho thấy bạn sẽ quay về đúng hạn.

## 4. Mục đích chuyến đi cụ thể
Chuẩn bị lịch trình dự kiến: đi đâu, bao lâu, ở đâu, ai chi trả.

## 5. Mang theo giấy tờ gọn gàng
Sắp xếp theo thứ tự để có thể đưa ra ngay khi được hỏi.

## 6. Trang phục lịch sự
Không cần quá trang trọng, nhưng gọn gàng và thoải mái.

## 7. Luyện tập trước
TRIP hỗ trợ **luyện phỏng vấn 1 kèm 1** cho khách làm visa Mỹ và Schengen, giúp bạn quen với các câu hỏi thường gặp.`,
  },
];

const TOURS = [
  { slug: 'tour-bac-kinh-7n6d', image: '/img/tours/bac-kinh.jpg', title: 'Tour Bắc Kinh 7N6Đ', destination: 'Trung Quốc', region: 'quoc-te', duration: '7 ngày 6 đêm', departure: 'Đà Nẵng', price: 13990000, featured: 1,
    highlights: 'Tử Cấm Thành, Thiên An Môn\nVạn Lý Trường Thành\nDi Hoà Viên\nHỗ trợ visa Trung Quốc trọn gói' },
  { slug: 'tour-seoul-han-quoc-6n5d', image: '/img/tours/seoul.jpg', title: 'Tour Seoul – Hàn Quốc 6N5Đ', destination: 'Hàn Quốc', region: 'quoc-te', duration: '6 ngày 5 đêm', departure: 'Đà Nẵng', price: 16490000, featured: 1,
    highlights: 'Cung điện Gyeongbokgung\nĐảo Nami\nTháp Namsan\nHỗ trợ visa Hàn Quốc' },
  { slug: 'tour-singapore-malaysia-6n5d', image: '/img/tours/singapore.jpg', title: 'Tour Singapore – Malaysia 6N5Đ', destination: 'Singapore · Malaysia', region: 'quoc-te', duration: '6 ngày 5 đêm', departure: 'Đà Nẵng', price: 13490000, featured: 1,
    highlights: 'Gardens by the Bay\nTháp đôi Petronas\nCao nguyên Genting' },
  { slug: 'tour-bangkok-pattaya-5n4d', image: '/img/tours/bangkok.jpg', title: 'Tour Bangkok – Pattaya 5N4Đ', destination: 'Thái Lan', region: 'quoc-te', duration: '5 ngày 4 đêm', departure: 'Đà Nẵng', price: 7490000, featured: 1,
    highlights: 'Chùa Phật Vàng\nĐảo Coral\nChợ nổi Bốn Miền' },
  { slug: 'tour-nhat-ban', image: '/img/tours/nhat-ban.jpg', title: 'Tour Nhật Bản', destination: 'Nhật Bản', region: 'quoc-te', duration: 'Theo lịch', departure: 'Đà Nẵng', price: null,
    highlights: 'Cung đường vàng Tokyo – Phú Sĩ – Osaka\nHỗ trợ visa Nhật Bản' },
  { slug: 'tour-da-nang-phu-quoc-4n3d', image: '/img/tours/phu-quoc.jpg', title: 'Tour Đà Nẵng – Phú Quốc 4N3Đ', destination: 'Phú Quốc', region: 'trong-nuoc', duration: '4 ngày 3 đêm', departure: 'Đà Nẵng', price: null,
    highlights: 'Grand World\nCáp treo Hòn Thơm\nNam đảo & Bắc đảo' },
  { slug: 'tour-ba-na-hills-1-ngay', image: '/img/tours/ba-na.jpg', title: 'Tour Bà Nà Hills 1 ngày', destination: 'Đà Nẵng', region: 'trong-ngay', duration: '1 ngày', departure: 'Đà Nẵng', price: null,
    highlights: 'Cầu Vàng\nLàng Pháp\nFantasy Park' },
  { slug: 'tour-son-tra-ngu-hanh-son-hoi-an', image: '/img/tours/son-tra-hoi-an.jpg', title: 'Tour Sơn Trà – Ngũ Hành Sơn – Hội An', destination: 'Đà Nẵng · Hội An', region: 'trong-ngay', duration: '1 ngày', departure: 'Đà Nẵng', price: null,
    highlights: 'Chùa Linh Ứng\nNgũ Hành Sơn\nPhố cổ Hội An về đêm' },
  { slug: 'tour-cu-lao-cham-1-ngay', image: '/img/tours/cu-lao-cham.jpg', title: 'Tour Cù Lao Chàm 1 ngày', destination: 'Hội An', region: 'trong-ngay', duration: '1 ngày', departure: 'Đà Nẵng · Hội An', price: null,
    highlights: 'Cano cao tốc\nLặn ngắm san hô\nĐi bộ dưới biển (tuỳ chọn)' },
  { slug: 'tour-rung-dua-bay-mau-hoi-an', image: '/img/tours/bay-mau.jpg', title: 'Tour Rừng dừa Bảy Mẫu – Hội An', destination: 'Hội An', region: 'trong-ngay', duration: '1 ngày', departure: 'Đà Nẵng', price: null,
    highlights: 'Thuyền thúng rừng dừa\nPhố cổ Hội An' },
  { slug: 'tour-hue-1-ngay', image: '/img/tours/hue.jpg', title: 'Tour Huế 1 ngày từ Đà Nẵng', destination: 'Huế', region: 'trong-ngay', duration: '1 ngày', departure: 'Đà Nẵng', price: null,
    highlights: 'Đại Nội Huế\nChùa Thiên Mụ\nLăng Khải Định' },
  { slug: 'tour-vinwonders-nam-hoi-an', image: '/img/tours/hoi-an-dem.jpg', title: 'Tour VinWonders Nam Hội An 1 ngày', destination: 'Hội An', region: 'trong-ngay', duration: '1 ngày', departure: 'Đà Nẵng', price: null,
    highlights: 'Công viên chủ đề\nRiver Safari\nBiểu diễn thực cảnh' },
];

function seed() {
  // Tài khoản admin
  const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (userCount === 0) {
    let password = config.adminPassword;
    if (password && password.length < 8) {
      throw new Error('ADMIN_PASSWORD quá ngắn (tối thiểu 8 ký tự).');
    }
    if (!password) {
      password = crypto.randomBytes(9).toString('base64url');
      console.log('\n================================================================');
      console.log(` Đã tạo tài khoản quản trị: ${config.adminUsername} / ${password}`);
      console.log(' Hãy đăng nhập /admin và đổi mật khẩu ngay.');
      console.log('================================================================\n');
    }
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
      .run(config.adminUsername, bcrypt.hashSync(password, 10));
  }

  const insSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) insSetting.run(k, v);

  // Bổ sung ảnh cho tour mẫu còn trống ảnh (database tạo trước khi có ảnh); không đè ảnh đã đổi trong Dashboard
  const fillImg = db.prepare("UPDATE tours SET image = ? WHERE slug = ? AND (image IS NULL OR image = '')");
  for (const t of TOURS) if (t.image) fillImg.run(t.image, t.slug);

  // Dữ liệu mẫu (bài viết, tour) chỉ tạo 1 lần; xoá hết trong Dashboard thì không bị tạo lại khi khởi động
  const seeded = db.prepare("SELECT value FROM settings WHERE key = 'seeded_content'").get();
  if (seeded) return;
  // Database có từ phiên bản trước (đã có tài khoản trước lần chạy này): đánh dấu đã có dữ liệu, không thêm dữ liệu mẫu
  if (userCount > 0) {
    db.prepare("INSERT INTO settings (key, value) VALUES ('seeded_content', datetime('now'))").run();
    return;
  }
  db.prepare("INSERT INTO settings (key, value) VALUES ('seeded_content', datetime('now'))").run();

  if (db.prepare('SELECT COUNT(*) AS n FROM posts').get().n === 0) {
    const ins = db.prepare(`INSERT INTO posts (slug, title, category, excerpt, content, status, published_at)
      VALUES (?, ?, ?, ?, ?, 'published', datetime('now', ?))`);
    POSTS.forEach((p, i) => ins.run(p.slug, p.title, p.category, p.excerpt, p.content, `-${i * 3} days`));
  }

  if (db.prepare('SELECT COUNT(*) AS n FROM tours').get().n === 0) {
    const ins = db.prepare(`INSERT INTO tours (slug, title, destination, region, duration, departure, price, image, highlights, featured, sort)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    TOURS.forEach((t, i) => ins.run(t.slug, t.title, t.destination, t.region, t.duration, t.departure, t.price, t.image || null, t.highlights, t.featured || 0, i));
  }
}

module.exports = { seed, DEFAULT_SETTINGS };
