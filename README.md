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

Video nền phần đầu trang chủ (`hero-montage.mp4`), video 4 thị trường (`public/media/markets/`), ảnh trang Visa (`public/img/visa/`) và ảnh tour nước ngoài (`public/img/tours/`) lấy từ [Mixkit](https://mixkit.co). Giấy phép Mixkit Free License cho phép dùng miễn phí cho mục đích thương mại, không bắt buộc ghi nguồn. Mã video gốc:

| Nước | Mã video gốc |
|---|---|
| Trung Quốc | Vạn Lý Trường Thành 20806, 28660 · Tử Cấm Thành 31010 |
| Hàn Quốc | Cổng Gwanghwamun 22139 · Cung điện 20095 |
| Nhật Bản | Núi Phú Sĩ 30148 · Chùa Senso-ji 4403 · Hoa anh đào 30141 |
| Châu Âu | Tháp Eiffel 25220, 27046 |
| Tour | Singapore 20177 · Bangkok 22171 |

### Ảnh trang dịch vụ

Ảnh trong `public/img/services/` là khung hình cắt từ video miễn phí của [Mixkit](https://mixkit.co) (Mixkit Free License, dùng thương mại được, không bắt buộc ghi nguồn), đã cắt 1200x800:

| File | Mã video gốc |
|---|---|
| `ho-chieu.jpg` | 27691 |
| `ve-may-bay.jpg` | 4368 |
| `dich-thuat.jpg` | 34096 |
| `hop-phap-hoa.jpg` | 22856 |
| `bao-hiem.jpg` | 45509 |
| `thue-xe.jpg` | 41389 |

`public/img/logo-plane.png` là hình máy bay tách từ logo TRIP, dùng làm logo chìm ở đầu các trang con.

### Ảnh tour trong nước

Ảnh 7 tour trong nước lấy từ [Wikimedia Commons](https://commons.wikimedia.org), chỉ chọn ảnh giấy phép CC0 hoặc Public domain (dùng thương mại tự do, không bắt buộc ghi nguồn). Đã cắt 800x600 và xoá metadata. Không dùng ảnh Pinterest vì không có quyền dùng thương mại.

| File | Nội dung | Ảnh gốc | Giấy phép |
|---|---|---|---|
| `ba-na.jpg` | Cầu Vàng, Bà Nà Hills | [Golden Bridge at Ba Na Hills 20250718.jpg](https://commons.wikimedia.org/wiki/File:Golden_Bridge_at_Ba_Na_Hills_20250718.jpg) | CC0 |
| `phu-quoc.jpg` | Hoàng hôn Phú Quốc | [1 Phu Quoc sunset.jpg](https://commons.wikimedia.org/wiki/File:1_Phu_Quoc_sunset.jpg) | CC0 |
| `son-tra-hoi-an.jpg` | Phố cổ Hội An | [Hoi An - HoiAn1457.jpg](https://commons.wikimedia.org/wiki/File:Hoi_An_-_HoiAn1457.jpg) | CC0 |
| `cu-lao-cham.jpg` | Bãi biển Cù Lao Chàm | [A seaside shot in Cù Lao Chàm, Quảng Nam province, taken in July 2024.jpg](https://commons.wikimedia.org/wiki/File:A_seaside_shot_in_C%C3%B9_Lao_Ch%C3%A0m,_Qu%E1%BA%A3ng_Nam_province,_taken_in_July_2024.jpg) | CC0 |
| `bay-mau.jpg` | Thuyền thúng rừng dừa | [Basket Boat and the Bamboo forest (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Basket_Boat_and_the_Bamboo_forest_(Unsplash).jpg) | CC0 |
| `hue.jpg` | Chùa Thiên Mụ, Huế | [Hue Thien Mu-Pagoda.JPG](https://commons.wikimedia.org/wiki/File:Hue_Thien_Mu-Pagoda.JPG) | Public domain |
| `hoi-an-dem.jpg` | Sông Hoài, Hội An về đêm | [Hoi An - HoiAn1441.jpg](https://commons.wikimedia.org/wiki/File:Hoi_An_-_HoiAn1441.jpg) | CC0 |

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
