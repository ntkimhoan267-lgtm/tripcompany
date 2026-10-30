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
- Viết blog, quản lý tour.
- Cài đặt và quản lý tài khoản nhân viên.

**SEO**
- Meta title, description và Open Graph cho từng trang.
- `sitemap.xml`, `robots.txt`.
- Dữ liệu có cấu trúc schema.org (TravelAgency).

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

Vào Dashboard → **Cài đặt → Video trang chủ** và dán một trong ba loại link:

- **File MP4 trong `public/media/`** (khuyên dùng, video tự chạy). Ví dụ `/media/trip-intro.mp4`. Nên nén video xuống dưới 15MB:
  ```bash
  ffmpeg -i TRIP_final.mp4 -vf scale=-2:720 -c:v libx264 -crf 28 -preset slow -an -movflags +faststart public/media/trip-intro.mp4
  ```
- **Link YouTube.**
- **Link Google Drive.** File phải để chế độ "Bất kỳ ai có đường liên kết".

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
views/                    Giao diện (EJS)
public/                   CSS, JS, ảnh, logo
google-apps-script/       Code dán vào Google Apps Script
docs/                     Tài liệu
```

## Cập nhật bảng giá

Bảng giá nằm trong file `src/data/services.js`. Khi đổi giá:
1. Sửa con số trong file này.
2. Commit và push. Render sẽ tự triển khai lại.

**Chỉ nhập giá khách lẻ (Public).**
