# Website TRIP · tripdn.com

Website của **Công ty TNHH Dịch thuật và Dịch vụ Du lịch TRIP**. Dịch vụ trọng tâm: **Visa** và **Dịch thuật công chứng**.

## Website có gì

**Trang dành cho khách**
- Trang chủ dạng landing page, có video giới thiệu.
- Trang Visa, Dịch thuật và các dịch vụ khác: hộ chiếu, vé máy bay, tour, thuê xe, bảo hiểm và eSIM.
- Trang Bảng giá. Chỉ hiển thị **giá khách lẻ**, không hiển thị giá đại lý.
- Các trang Tour, Cẩm nang (blog), Giới thiệu, Liên hệ (kèm Google Maps).

**Popup và form**
- Popup tư vấn: khách điền họ tên, số điện thoại và dịch vụ cần tư vấn.
- Popup nhận tin tour hàng tháng bằng email.
- Thanh liên hệ nổi: Zalo, Messenger, nút gọi.

**Google Sheet và Gmail**
- Thông tin khách tự ghi vào Google Sheet trong Drive.
- Email thông báo gửi tới `ntkimhoan267@gmail.com` và `triptranslate.com@gmail.com`.

**Dashboard `/admin`**
- Tổng quan kèm biểu đồ.
- Quản lý khách tư vấn: đổi trạng thái, thêm ghi chú, xuất CSV.
- Quản lý danh sách đăng ký nhận tin.
- Gửi bản tin tháng.
- Viết blog chuẩn SEO: mục lục "Nội dung chính" tự tạo, tiêu đề/mô tả Google, từ khoá chính, FAQ, hẹn giờ đăng,
  4 giao diện bài viết, chấm điểm SEO và xem trước kết quả Google. Quản lý tour.
- **Bảng giá & ưu đãi**: sửa giá mọi dịch vụ, bật/tắt ưu đãi "giảm 500.000đ khi để lại SĐT hoặc Gmail".
- **Ảnh & video**: đổi ảnh, video nền của từng dịch vụ, trang visa, trang chủ.
- Cài đặt và quản lý tài khoản nhân viên.

**SEO**
- Meta title, description và Open Graph cho từng trang.
- `sitemap.xml` (có ngày cập nhật bài viết, tour), `robots.txt`.
- Dữ liệu có cấu trúc schema.org: TravelAgency, BreadcrumbList; bài viết có BlogPosting và FAQPage.
- Đổi đường dẫn bài viết đã đăng: link cũ tự chuyển hướng 301.

## Công nghệ

- Node.js ≥ 22.13, Express, EJS (render phía server, tốt cho SEO).
- Database SQLite có sẵn trong Node (`node:sqlite`). Không cần cài database riêng.
- Kết nối Google bằng Google Apps Script. Không cần tài khoản Google Cloud.

## Chạy trên máy

```bash
npm install
```

```bash
ADMIN_PASSWORD=matkhau123 npm run dev
```

Mở http://localhost:3000, và vào trang quản trị tại http://localhost:3000/admin (tài khoản `admin`, mật khẩu `matkhau123`).

Nếu không đặt `ADMIN_PASSWORD`, mật khẩu ngẫu nhiên được in ra terminal ở lần chạy đầu tiên.

Chạy kiểm thử:

```bash
npm test
```

## Đưa website lên mạng và gắn domain tripdn.com

### Cách 1: Render (khuyên dùng)

Chi phí khoảng 7 USD/tháng, đã gồm ổ đĩa lưu dữ liệu.

1. Đăng nhập https://render.com bằng GitHub.
2. Chọn **New → Blueprint**, rồi chọn repo `tripcompany`. Render đọc file `render.yaml` và tự cấu hình.
3. Nhập các biến:
   - `ADMIN_PASSWORD`
   - `GOOGLE_SCRIPT_URL` và `GOOGLE_SCRIPT_SECRET` (xem [docs/HUONG-DAN-GOOGLE-SHEET.md](docs/HUONG-DAN-GOOGLE-SHEET.md))
4. Mở **Settings → Custom Domains** để lấy bản ghi DNS. Vào trang quản lý domain `tripdn.com` và trỏ:
   - `tripdn.com`: bản ghi **A** tới IP Render cung cấp
   - `www.tripdn.com`: bản ghi **CNAME** tới `trip-website.onrender.com`

   Render tự cấp chứng chỉ HTTPS.

### Cách 2: VPS (Ubuntu)

```bash
git clone https://github.com/ntkimhoan267-lgtm/tripcompany.git
```

```bash
cd tripcompany && npm ci --omit=dev && cp .env.example .env
```

Sửa file `.env`, rồi chạy bằng pm2 và dùng Nginx làm reverse proxy cho cổng 3000:

```bash
pm2 start npm --name trip -- start
```

> ⚠️ Database (`data/trip.db`) và ảnh upload (`data/uploads`) phải nằm trên ổ đĩa bền vững (biến `DATA_DIR`). Nên sao lưu thư mục này định kỳ.

## Video trang chủ

Trang chủ dùng 2 file trong `public/media/`, dựng từ video `TRIP_final.mp4`:

| File | Dùng ở đâu |
|---|---|
| `trip-teaser.mp4` | Đoạn khoảng 11 giây, khổ dọc 3:4, không tiếng, ~1MB. Tự chạy lặp trong khung cửa sổ máy bay. |
| `trip-intro.mp4` | Video đầy đủ 720p, có tiếng. Phát khi khách bấm **Xem video về TRIP**. |

Khi có video mới, bạn có hai cách:
- Đổi link trong Dashboard → **Cài đặt → Video trang chủ**. Hỗ trợ file MP4, link YouTube, hoặc link Google Drive (file phải chia sẻ "Bất kỳ ai có đường liên kết").
- Nén lại rồi thay file trong `public/media/`:

```bash
ffmpeg -i TRIP_final.mp4 -map 0:v:0 -map 0:a:0 -vf scale=1280:720 -c:v libx264 -crf 28 -preset slow -c:a aac -b:a 96k -movflags +faststart public/media/trip-intro.mp4
```

### Video và ảnh các nước

Video nền phần đầu trang chủ (`hero-montage.mp4`), video 4 thị trường (`public/media/markets/`), và ảnh tour Nhật Bản lấy từ [Mixkit](https://mixkit.co). Giấy phép Mixkit Free License cho phép dùng miễn phí cho mục đích thương mại, không bắt buộc ghi nguồn. Mã video gốc:

| Nước | Mã video gốc |
|---|---|
| Trung Quốc | Vạn Lý Trường Thành 20806, 28660 · Tử Cấm Thành 31010 |
| Hàn Quốc | Cổng Gwanghwamun 22139 · Cung điện 20095 |
| Nhật Bản | Núi Phú Sĩ 30148 · Chùa Senso-ji 4403 · Hoa anh đào 30141 |
| Châu Âu | Tháp Eiffel 25220, 27046 |

### Ảnh minh hoạ (visa, dịch vụ, tour, cẩm nang)

Ảnh trong `public/img/visa/`, `public/img/services/`, `public/img/tours/` (trừ `nhat-ban.jpg`), `public/img/home/` và `public/img/blog/` là bộ ảnh do TRIP cung cấp (tạo bằng AI, không chữ, không logo). Đã nén lại: ảnh tour 1000x667, các ảnh khác 1200x800, xoá metadata.

Ảnh tạo bằng AI chỉ mang tính minh hoạ, không dùng làm bằng chứng về phương tiện hay địa điểm cụ thể của tour.

Ảnh hộ chiếu thật (`public/img/services/ho-chieu-viet-nam.jpg`, `public/img/blog/ho-chieu-san-bay.jpg`), ảnh Núi Thần Tài (`public/img/tours/nui-than-tai.jpg`) và VinWonders Nam Hội An (`public/img/tours/vinwonders-nam-hoi-an.jpg`) do TRIP cung cấp tháng 11/2026.

`public/img/tours/nhat-ban.jpg` lấy từ Mixkit. `public/img/logo-plane.png` là hình máy bay tách từ logo TRIP, dùng làm logo chìm ở đầu các trang con.

## Cấu trúc thư mục

```
server.js                 Khởi động Express
src/config.js             Biến môi trường
src/db.js, src/seed.js    Database & dữ liệu mẫu (admin, bài viết, tour)
src/data/company.js       Thông tin công ty, hotline, tư vấn viên
src/data/services.js      Dịch vụ & BẢNG GIÁ CÔNG KHAI (sửa giá ở đây)
src/routes/public.js      Các trang website
src/routes/api.js         API form tư vấn / nhận tin
src/routes/admin.js       Dashboard
src/lib/google.js         Gửi dữ liệu sang Google Apps Script
src/lib/catalog.js        Bảng giá sửa được trong Dashboard (đè lên giá mặc định)
src/lib/offer.js          Ưu đãi "giảm X khi để lại SĐT/Gmail", hiển thị giá
src/lib/media.js          Ảnh & video sửa được trong Dashboard
src/lib/toc.js            Mục lục bài viết, FAQ, giao diện bài viết
src/data/articles/        Bài viết SEO thêm sẵn (tự đăng 1 lần khi khởi động)
views/                    Giao diện (EJS)
public/                   CSS, JS, ảnh, logo
google-apps-script/       Code dán vào Google Apps Script
docs/                     Tài liệu
```

## Cập nhật bảng giá

Cách thường dùng: **Dashboard → Bảng giá & ưu đãi** (tài khoản chủ). Sửa xong bấm Lưu, website cập nhật ngay.

Giá **mặc định** nằm trong `src/data/services.js`. Bảng nào đã sửa trong Dashboard sẽ dùng giá đã sửa
(lưu trong database, khoá `catalog_v1`) thay vì giá trong file; tick "Khôi phục giá mặc định" để quay về giá trong file.

**Chỉ nhập giá khách lẻ (Public), giá thật.** Khi bật ưu đãi, website tự cộng số tiền ưu đãi (mặc định 500.000đ / 20 USD)
để làm giá niêm yết; khách để lại SĐT hoặc Gmail thì thấy giá thật.

## Bộ Skill xây website đa ngành

Quy trình đã dùng cho TRIP được đóng gói thành bộ skill trong `.claude/skills/` (nghiên cứu thị trường → chọn 3–5 đối thủ REACH cao nhất → brief → thiết kế → code → kiểm tra → triển khai). Xem [docs/BO-SKILL-BUILD-WEBSITE.md](docs/BO-SKILL-BUILD-WEBSITE.md).
