# PROMPT: Xây dựng website TRIP (tripdn.com)

> Dán toàn bộ nội dung dưới đây cho AI lập trình (hoặc gửi lập trình viên). Prompt mô tả đúng phiên bản website hiện tại: chức năng, dữ liệu, giao diện, bảo mật và tiêu chí nghiệm thu.

---

## 0. Vai trò và mục tiêu

Bạn là lập trình viên full-stack kiêm UX/UI designer. Hãy xây dựng **website hoàn chỉnh** (giao diện + backend + Dashboard quản trị) cho **Công ty TNHH Dịch thuật và Dịch vụ Du lịch TRIP** tại Đà Nẵng.

Mục tiêu kinh doanh, theo thứ tự ưu tiên:
1. Thu **khách hàng tiềm năng (lead)**: khách để lại Tên, Số điện thoại và Dịch vụ cần tư vấn.
2. Giới thiệu **2 dịch vụ trọng tâm**: **Visa** (mạnh nhất Trung Quốc, Hàn Quốc, Nhật Bản; thêm Châu Âu) và **Dịch thuật công chứng**.
3. Thu **email nhận bản tin** hằng tháng về tour và ưu đãi.
4. Tạo uy tín: số liệu thật, đội ngũ thật, giá công khai minh bạch.

Toàn bộ giao diện bằng **tiếng Việt có dấu**.

---

## 1. Thông tin công ty

| Mục | Nội dung |
|---|---|
| Tên pháp lý | Công ty TNHH Dịch thuật và Dịch vụ Du lịch TRIP |
| Thương hiệu / slogan | TRIP – *Let Your Adventures Begin With Us* |
| Mã số thuế | 0402222965 |
| Địa chỉ | Phòng 406, Tầng 4, 35 Cao Thắng, Hải Châu, Đà Nẵng |
| Tên miền | tripdn.com |
| Email | triptranslate.com@gmail.com |
| Hotline Visa & Tour | 0935.191.394 (Phạm Minh Trí), đồng thời là số Zalo |
| Hotline Dịch thuật | 0768.141.862 (Phạm Trang) |
| Fanpage | https://www.facebook.com/triptranslate/ · Messenger: https://m.me/triptranslate |
| Giờ làm việc | Thứ 2 – Thứ 6: 08:00 – 17:00 · Thứ 7: 08:00 – 12:00 |

**Tư vấn viên theo mảng** (hiển thị ở khung "Gọi trực tiếp" trên từng trang dịch vụ):
- Visa: Phạm Minh Trí 0935191394 · Lê Kim Ngọc Nhi 0886933786 · Lâm Thị Yến Nhị 0971712254
- Dịch thuật: Phạm Trang 0768141862 · Lâm Thị Yến Nhị 0971712254
- Hộ chiếu: Phan Sỹ Nhật Anh 0935182687
- Vé máy bay: Lâm Thị Yến Nhị · Xe: Phạm Minh Trí, Phan Sỹ Nhật Anh · Tour: Phạm Minh Trí · Khác: Phạm Trang

**Số liệu thành tích** (đã được TRIP xác nhận, lấy từ video giới thiệu chính thức): **5 năm** đồng hành · **10.000+** hồ sơ đã thực hiện · **98%** tỉ lệ đậu visa.

**Email nhận thông báo lead** (và được chia sẻ Google Sheet): ntkimhoan267@gmail.com, triptranslate.com@gmail.com.

---

## 2. Quy tắc bắt buộc (KHÔNG được vi phạm)

1. **Chỉ hiển thị giá khách lẻ (giá công khai).** Tuyệt đối không đưa giá đại lý (Net) hay hoa hồng (COM) lên web, kể cả trong code, comment hay dữ liệu mẫu.
2. **Không đưa chính sách hoàn phí / hoàn tiền** của TRIP lên website.
3. **Không tạo đánh giá giả.** Đánh giá chỉ đến từ khách thật, qua form trên web (trạng thái *chờ duyệt*) hoặc do quản trị viên nhập kèm nguồn và xác nhận "đánh giá thật". Khi chưa có đánh giá nào thì hiện trạng thái trống, mời khách đánh giá.
4. **Không tự bịa số liệu hay cam kết quảng cáo.** Chỉ dùng số liệu ở mục 1. Số quốc gia visa phải **tính từ dữ liệu** (hiện là 19 quốc gia & vùng lãnh thổ). Giá tour chưa được TRIP xác nhận thì hiển thị "Liên hệ".
5. **Không dán mã bí mật vào code hay chat.** Mọi secret lấy từ biến môi trường hoặc Script Properties.
6. **Ảnh và video phải có quyền sử dụng thương mại** (ảnh TRIP cung cấp, Mixkit, ảnh CC0 / Public domain). Không lấy ảnh Pinterest hay ảnh website đối thủ.
7. Câu tiêu đề trang chủ giữ nguyên thông điệp: **"Visa & Dịch thuật trọn gói, nhanh gọn ngay tại Đà Nẵng"**.

---

## 3. Công nghệ và kiến trúc

- **Node.js ≥ 22.13**, dùng `node:sqlite` có sẵn (không cần cài database riêng).
- **Express 4** + **EJS** render phía server (tốt cho SEO, không cần build frontend).
- Thư viện: `cookie-session`, `bcryptjs`, `multer` (memoryStorage), `sharp` (mã hoá lại ảnh tải lên thành WebP, xoá EXIF), `marked` + `sanitize-html` (bài viết Markdown), `helmet` (CSP), `express-rate-limit`, `compression`.
- JavaScript phía trình duyệt viết thuần (vanilla), không framework. CSS viết tay, dùng biến CSS.
- **Google Apps Script** làm cầu nối Google Sheet + Gmail (mục 7).
- Triển khai: **Render** (`render.yaml`, ổ đĩa lưu tại `/var/data` cho database và ảnh tải lên), gắn tên miền tripdn.com.
- Bản xem trước tĩnh: script xuất ra HTML tĩnh cho **GitHub Pages** (mục 12).

**Cấu trúc thư mục:**

```
server.js                    # Express: helmet/CSP, compression, static, session, route, lỗi 404/500
src/config.js                # đọc .env, kiểm tra SESSION_SECRET (≥32 ký tự, không phải chuỗi mẫu)
src/db.js                    # bảng + migration (kiểm tra cột rồi ALTER TABLE)
src/seed.js                  # admin đầu tiên, settings mặc định, bài viết/tour mẫu (chỉ 1 lần)
src/data/company.js          # thông tin công ty (mục 1)
src/data/services.js         # dịch vụ & bảng giá công khai (mục 5)
src/lib/helpers.js           # định dạng tiền, SĐT, ngày giờ VN, slug, settings, parseVideo
src/lib/security.js          # csrf, requireAdmin, async wrapper
src/lib/google.js            # gọi Apps Script có ký HMAC
src/lib/nowrap.js            # không ngắt dòng giữa từ ghép tiếng Việt (mục 11)
src/routes/public.js|api.js|admin.js
views/partials/*.ejs         # head, footer, page-hero, lead-form, stamp, clouds, price/*...
views/pages/*.ejs            # các trang công khai
views/admin/*.ejs            # Dashboard
public/css/site.css, public/js/site.js, public/img/*, public/media/*
google-apps-script/Code.gs   # dán vào Apps Script
scripts/export-static.js     # xuất bản xem trước tĩnh
test/app.test.js             # test tích hợp
```

---

## 4. Sơ đồ trang và nội dung

> Nguyên tắc: **trang chủ chỉ chứa phần nổi bật**, không phải landing page dài vô tận. Mỗi mục trên menu mở **một trang riêng**.

**Menu:** Visa ▾ · Dịch thuật ▾ · Dịch vụ khác ▾ · Tour · Bảng giá · Cẩm nang · Giới thiệu · Liên hệ · nút **Tư vấn miễn phí**. Có thanh trên cùng (địa chỉ, giờ làm, hotline, Fanpage).

| Đường dẫn | Nội dung |
|---|---|
| `/` | Hero video + tiêu đề, form nhanh "boarding pass", số liệu, 4 thẻ thị trường visa (video), dải Dịch thuật, tour nổi bật, đánh giá (chỉ khi có), khối Về TRIP (ảnh đội ngũ), khối kêu gọi tư vấn |
| `/visa` | Tổng quan: 4 thị trường + Visa nước khác + E-visa, quy trình 4 bước, đã gồm / chưa gồm |
| `/visa/trung-quoc`, `/han-quoc`, `/nhat-ban`, `/chau-au`, `/nuoc-khac`, `/e-visa` | Bảng giá dạng thẻ, đã gồm / chưa gồm, hồ sơ cần chuẩn bị, khung "Kiểm tra hồ sơ miễn phí" (nút Zalo), visa nước khác, sidebar form + tư vấn viên |
| `/dich-vu` | 2 thẻ lớn Visa & Dịch thuật (ảnh nền) + lưới dịch vụ khác có ảnh |
| `/dich-vu/dich-thuat` | Ưu điểm, bảng giá 3 gói ngôn ngữ, phụ phí, tài liệu thường dịch, liên kết Hợp pháp hoá, quy trình |
| `/dich-vu/hop-phap-hoa-lanh-su` | Loại giấy tờ, bảng giá chứng nhận lãnh sự Trung Quốc, quy trình |
| `/dich-vu/ho-chieu`, `/ve-may-bay`, `/tour`, `/thue-xe`, `/bao-hiem-esim` | Trang dịch vụ phụ dùng chung 1 template |
| `/bang-gia` | Bảng giá theo **tab**: Visa Trung Quốc · Visa các nước (lọc theo châu lục) · Dịch thuật · E-visa · Hộ chiếu · Xe đưa đón |
| `/tour`, `/tour/:slug` | Danh sách tour có lọc (quốc tế / trong nước / trong ngày), chi tiết tour |
| `/blog`, `/blog/:slug` | Cẩm nang (lọc theo chuyên mục), bài viết Markdown |
| `/danh-gia` | Đánh giá đã duyệt, điểm trung bình, form gửi đánh giá |
| `/gioi-thieu` | Câu chuyện, ảnh đội ngũ, giá trị cốt lõi, tư vấn viên, thông tin doanh nghiệp |
| `/lien-he` | Thẻ hotline / Zalo / email / địa chỉ, bản đồ Google, form |
| `/huy-dang-ky` | GET hiện trang xác nhận, POST mới huỷ nhận bản tin |
| `/robots.txt`, `/sitemap.xml`, trang 404 | |
| Chuyển hướng 301 | `/dich-vu/visa` → `/visa` |

**Tour mẫu:** Bắc Kinh 7N6Đ, Seoul 6N5Đ, Singapore – Malaysia 6N5Đ, Bangkok – Pattaya 5N4Đ, Nhật Bản, Đà Nẵng – Phú Quốc 4N3Đ, Bà Nà Hills 1 ngày, Sơn Trà – Ngũ Hành Sơn – Hội An, Cù Lao Chàm, Rừng dừa Bảy Mẫu – Hội An, Huế 1 ngày, VinWonders Nam Hội An. Giá để "Liên hệ" cho đến khi TRIP xác nhận.

**Bài viết mẫu (3 bài):** Thủ tục visa Trung Quốc · Công chứng dấu công ty hay dấu tư pháp · Kinh nghiệm phỏng vấn visa Mỹ.

---

## 5. Dữ liệu dịch vụ và bảng giá công khai

Lưu tập trung ở `src/data/services.js`. Mọi trang đọc từ đây, **không viết cứng giá trong giao diện**. Tiền VNĐ hiển thị `2.800.000đ`, USD hiển thị `$120`.

**Danh sách dịch vụ trong form:** Visa Trung Quốc · Visa Hàn Quốc · Visa Nhật Bản · Visa Châu Âu (Schengen, Anh) · Visa Mỹ / Úc / Canada · Visa nước khác · E-visa Việt Nam (người nước ngoài) · Dịch thuật công chứng · Hợp pháp hoá lãnh sự · Hộ chiếu · Vé máy bay / Vé tàu · Tour du lịch · Thuê xe / Xe đưa đón · Bảo hiểm du lịch / eSIM · Khác.

**Visa Trung Quốc** (quốc tịch Việt Nam, xét duyệt thường 10–14 ngày làm việc):

| Loại | Lưu trú / nhập cảnh | Giá |
|---|---|---|
| Du lịch (L) – 15 ngày | Tối đa 15 ngày | 2.800.000đ |
| Du lịch (L) – 30 ngày | Tối đa 30 ngày | 2.900.000đ |
| Thăm thân (Q1, Q2) | 1 lần | 3.200.000đ |
| Thương mại (M) | 1 lần | 3.000.000đ |
| Thương mại / Thăm thân – 2 lần | 2 lần | 4.000.000đ |
| Thương mại / Thăm thân – 6 tháng | Nhiều lần | 4.800.000đ |
| Thương mại / Thăm thân – 1 năm | Nhiều lần | 6.200.000đ |
| Thăm thân (S1, S2) | Người thân chuyên gia | 3.200.000đ |
| Du học (X1, X2) | Học sinh, sinh viên | 3.000.000đ |
| Combo Visa Kết hôn (S2) | Trọn gói thủ tục kết hôn | 8.200.000đ |

Ghi chú: làm nhanh (Express) cộng 35 USD phí Lãnh sự và 375.000đ phí dịch vụ.

**Visa các nước** (trọn gói):

| Quốc gia | Loại | Thời gian | Giá |
|---|---|---|---|
| Hàn Quốc | Du lịch Single 3 tháng (nộp khẩn +20 USD) | 10 ngày làm việc | $120 |
| Hàn Quốc | Multiple 5 năm / 10 năm | 10 ngày làm việc | $230 |
| Nhật Bản | Du lịch Single 3 tháng | 7 ngày làm việc | 3.800.000đ |
| Nhật Bản | Multiple 1 năm / 3 năm (đã gồm phí lãnh sự) | 7 ngày làm việc | 6.500.000đ |
| Vương quốc Anh | Standard Visitor 6 tháng | 3–4 tuần | $444 |
| Vương quốc Anh | Du học 6 tháng | 3–4 tuần | $1.000 |
| Pháp / Ý / Đức / Tây Ban Nha / Thụy Sĩ / Bỉ (Schengen) | Du lịch / Thăm thân / Công tác | 10–25 ngày | $230 / $260 / $240 / $220 / $250 / $225 |
| Hoa Kỳ | B1/B2 phỏng vấn lần đầu · gia hạn miễn phỏng vấn | Theo lịch LSQ · 2–3 tuần | $250 · $260 |
| Canada | Du lịch / Công tác / Thăm thân | 19–21 ngày | $296 |
| Úc | Subclass 600 (chưa gồm phí lăn tay) | 2–4 tuần | $260 |
| New Zealand | Visitor Visa | 3–5 tuần | $240 |
| Đài Loan (chưa gồm phí giao nhận) · Hồng Kông · Macau (cộng phí dịch thuật) · Ấn Độ · Dubai | Du lịch | 14–21 ngày | $150 · $120 · $140 · $70 · $185 |

- **Đã bao gồm:** phí nộp Lãnh sự quán / Đại sứ quán / trung tâm tiếp nhận; dịch thuật, công chứng tư pháp giấy tờ cơ bản; tư vấn hồ sơ, khai form, đặt lịch hẹn; luyện phỏng vấn 1 kèm 1 (Châu Âu và nước khác).
- **Chưa bao gồm:** VAT; phí VIP / Premium tại trung tâm tiếp nhận; bảo hiểm du lịch (bắt buộc với Schengen); vé máy bay và khách sạn thật.
- **Hồ sơ cơ bản:** hộ chiếu còn hạn ≥ 6 tháng, ảnh thẻ nền trắng, CCCD, giấy tờ công việc, giấy tờ tài chính, lịch trình / đặt vé / khách sạn dự kiến.

**4 thị trường trọng tâm:** Trung Quốc (từ 2.800.000đ, 10–14 ngày làm việc) · Hàn Quốc (từ $120, 10 ngày làm việc) · Nhật Bản (từ 3.800.000đ, 7 ngày làm việc) · Châu Âu (từ $220, 10 ngày – 4 tuần).

**E-visa Việt Nam** (khách nước ngoài, USD, 1 lần / nhiều lần): Tiêu chuẩn 40/70 · 2 ngày làm việc 65/90 · 1 ngày 75/100 · 4 giờ 85/115 · 2 giờ 160/185. Fast Track và hỗ trợ hành lý: 15 USD/khách (nhóm 1–5), 12 USD/khách (nhóm từ 6). Khách quốc tịch Việt Nam được giảm Fast Track còn 12 / 10 USD.

**Dịch thuật** (giá/trang, tài liệu phổ thông):

| Ngôn ngữ | Tiêu chuẩn | Công chứng dấu công ty | Dấu công ty – Hoả tốc / Không theo form | Dấu tư pháp |
|---|---|---|---|---|
| Việt ⇄ Anh | 40.000đ | 50.000đ | 70.000đ | 100.000đ |
| Việt ⇄ Trung / Hàn / Nhật | 80.000đ | 90.000đ | 120.000đ | — |
| Việt ⇄ Thái / Lào | 190.000đ | 200.000đ | 230.000đ | — |
| Ngôn ngữ khác | Báo giá khi nhận tài liệu | | | |

Phụ phí: công chứng dấu công ty 15.000đ/dấu · dấu tư pháp 65.000đ/dấu · công chứng bản sao 15.000đ/tờ · in màu 12.000đ/trang · in bản sao 10.000đ/bản · ảnh thẻ 50.000đ/combo 10 tấm · hiệu đính 10.000đ/trang. Chưa gồm phí vận chuyển; văn bản chuyên ngành sâu báo giá riêng.

**Chứng nhận lãnh sự Trung Quốc:** giấy tờ dân sự 2.700.000đ · giấy tờ kinh tế 6.200.000đ (gồm tem đỏ). Hợp pháp hoá cho các nước khác thì liên hệ.

**Hộ chiếu phổ thông:** 500.000đ, 8–10 ngày làm việc. Mất hộ chiếu cấp lại +100.000đ. Chưa gồm chuyển phát (HCM – Đà Nẵng 1–2 ngày 130.000đ, trong ngày 330.000đ).

**Xe đưa đón** (Đà Nẵng – Hội An – Huế; 4 / 7 / 16 chỗ):
- Sân bay / Ga ⇄ KS Đà Nẵng (1 chiều): 120.000 / 150.000 / 300.000đ
- Các tuyến 2 chiều từ KS Đà Nẵng:

| Tuyến | 4 chỗ | 7 chỗ | 16 chỗ |
|---|---|---|---|
| Phố cổ Hội An | 500.000đ | 600.000đ | 1.000.000đ |
| Bà Nà | 600.000đ | 700.000đ | 1.100.000đ |
| Núi Thần Tài | 700.000đ | 800.000đ | 1.200.000đ |
| Sơn Trà | 300.000đ | 350.000đ | 750.000đ |
| VinWonders Nam Hội An | 800.000đ | 900.000đ | 1.300.000đ |
| VinWonders – Phố cổ | 900.000đ | 1.100.000đ | 1.400.000đ |
| Bảy Mẫu – Phố cổ | 600.000đ | 750.000đ | 1.200.000đ |
| Huế | 1.800.000đ | 2.000.000đ | 2.700.000đ |

- Thuê xe tự lái 800.000đ/ngày: Kia Seltos, Mazda CX-5 (4 chỗ), Toyota Veloz Cross (7 chỗ).

**Dịch vụ khác:** vé máy bay (Vietnam Airlines, Vietjet, Bamboo, Vietravel, Sun PhuQuoc Airways, AirAsia, Scoot, Jetstar, IndiGo, Cebu Pacific, Myanmar Airways International, Emirates); vé vui chơi (Bà Nà Hills, Núi Thần Tài, Mikazuki, du thuyền sông Hàn, Ký ức Hội An, VinWonders…); bảo hiểm du lịch Liberty; eSIM du lịch.

---

## 6. Thiết kế giao diện

**Phong cách:** nghệ thuật, du lịch, tin cậy. Dùng **ảnh và video thật** của các nước, không vẽ hình minh hoạ cho địa danh.

**Màu sắc:**
- Navy `#1f3a52` / `#112233` cho chữ tiêu đề, phần đầu trang và chân trang.
- Xanh trời từ logo `#5ba4d4`, `#2a6f9c`.
- Cam nhấn `#c4511f` cho nút chính và giá.
- Nền trang: **ảnh hoàng hôn Phú Quốc làm mờ**, cố định phía sau nội dung, phủ lớp trắng ~52% (`body::before`, `position: fixed`). Các thẻ nội dung nền trắng.

**Font chữ** (Google Fonts, có hỗ trợ tiếng Việt):
- Tiêu đề (h1, h2, giá, số): **Cormorant Garamond** 500–700, có chữ nghiêng (`<em>`) cho phần nhấn.
- Chữ thường: **Be Vietnam Pro** 300–700.
- Số dùng `font-variant-numeric: lining-nums`.

**Thành phần chính:**
- **Hero trang chủ:**
  - Video nền montage các nước, lớp phủ navy bên trái để chữ dễ đọc.
  - Bên phải là **khung cửa sổ máy bay (porthole)** chứa thumbnail video giới thiệu (rê chuột thì phát đoạn teaser, bấm thì mở video 4:14).
  - **4 tem visa** (中国, 한국, 日本, EU) bay nhẹ quanh khung. *Bắt buộc giữ.*
  - Mũi tên viết tay kèm chữ "Click vào đây để biết thêm về TRIP!". Chip 4 thị trường, 2 nút: Tư vấn visa / Báo giá dịch thuật.
- **Form nhanh dạng boarding pass** (cuống vé cam "DAD → Thế giới"), nằm đè lên mép dưới hero.
- **Phần đầu trang con** (partial `page-hero`), 2 cột:
  - Trái: breadcrumb, tiêu đề có phần in nghiêng, mô tả, các ô số liệu, nút tư vấn + hotline.
  - Phải: ảnh thật trong khung nghiêng nhẹ, huy hiệu tròn logo TRIP, tem visa, nhãn nổi (vd "98% tỉ lệ đậu visa").
  - Video nền theo trang: Trung / Hàn / Nhật / Châu Âu dùng video của nước đó, còn lại dùng montage. Logo máy bay chìm, viền mây phía dưới.
- **Thẻ giá dạng vé** (khấc vé, viền gạch, ruy băng "Phổ biến", nút tròn mở form tư vấn kèm dịch vụ chọn sẵn).
- **Thẻ theo quốc gia:** cờ tròn + danh sách loại visa, thời gian, giá. Lọc theo châu lục.
- **Gói dịch thuật:** 3 thẻ đầu màu (gói Trung · Hàn · Nhật nổi bật màu cam "Thế mạnh"), chữ trang trí EN / 中 한 日 / ไทย ລາວ.
- **Tab Bảng giá:**
  - Có `role=tablist`, phím mũi tên / Home / End; link `#id` mở đúng tab.
  - Thanh tab dính trên cùng khi cuộn, trên điện thoại cuộn ngang. Không JS thì hiện tất cả.
- **Thẻ tuyến xe** có ảnh điểm đến và 3 ô giá theo loại xe.
- Khối "Đã gồm / Chưa gồm" 2 cột màu, giấy tờ có icon + số thứ tự, quy trình dạng đường các bước, khung "Kiểm tra hồ sơ miễn phí" có logo + nút Zalo.
- **Nút nổi** Zalo / Messenger / Gọi bên phải. **Thanh dưới cùng trên điện thoại:** Gọi · Zalo · Tư vấn.
- Icon dạng SVG sprite tự viết. Cờ lấy từ flagcdn.com.

**Ảnh và video:**
- Ảnh visa, dịch vụ, tour và cẩm nang do TRIP cung cấp (không chữ, không logo), nén JPG 800–1200px. Ảnh đội ngũ và thumbnail video là ảnh thật, giữ màu tự nhiên.
- Video thị trường và montage lấy từ Mixkit. Video giới thiệu công ty do TRIP cung cấp.
- Độ tươi màu được xử lý sẵn trong file, không dùng `filter` CSS vì gây giật khi cuộn.

**Hiệu ứng:**
- Phần tử hiện dần khi cuộn tới, số liệu chạy tăng dần.
- Video chỉ phát khi nằm trong màn hình, tạm dừng khi cuộn qua.
- Tôn trọng `prefers-reduced-motion`.

**Responsive:**
- Menu dạng trượt (≤ 1180px). Panel bắt đầu đúng dưới header thật để không che nút đóng; nút nổi ẩn khi mở menu.
- Bảng chuyển thành thẻ trên màn hình ≤ 640px. Không được tràn ngang ở 360 – 1920px.
- Phần đầu trang con trên điện thoại gọn (khoảng 730px), hai nút xuống dòng khi hẹp.

---

## 7. Form, popup, Google Sheet và email

**Form tư vấn** (trang chủ, modal, sidebar, khối cuối trang):
- Trường: Họ tên, Số điện thoại (kiểm tra SĐT Việt Nam), Dịch vụ (dropdown mục 5, `value` cố định), Ghi chú (không bắt buộc).
- Có ô bẫy bot ẩn và ghi chú quyền riêng tư.
- Lưu nguồn trang (`/visa/han-quoc` → "Visa Hàn Quốc") để nhân viên biết khách đến từ đâu.
- Gửi xong thay form bằng màn hình cảm ơn, kèm nút Gọi / Zalo đúng hotline: dịch vụ dịch thuật dùng hotline dịch thuật.

**Popup nhận bản tin:**
- Ô email, hiện sau 45 giây **và** khi đã cuộn tới nửa trang.
- Không hiện ở trang Bảng giá / Liên hệ, và không hiện cho người vừa gửi form.
- API luôn trả cùng một thông báo, để không lộ email đã tồn tại hay chưa.

**Lưu dữ liệu:**
- Ghi vào SQLite trước. Sau đó gọi Google Apps Script để:
  1. Tự tạo Google Sheet trong Drive (tab Khách tư vấn / Nhận bản tin) nếu chưa có, chia sẻ cho 2 email ở mục 1.
  2. Thêm dòng mới.
  3. Gửi email thông báo khách mới tới 2 email đó.
- Lỗi khi đồng bộ không làm mất dữ liệu: Dashboard có nút "Đồng bộ lại".

**Bảo mật Apps Script:**
- Request gửi `{ payload, sig }`, trong đó `sig` = HMAC-SHA256 (UTF-8) của payload bằng `TRIP_SECRET` (≥ 32 ký tự, lưu trong Script Properties). Payload có `ts`: lệch quá 10 phút thì từ chối. Có cache chống gửi lại.
- Dùng `LockService` khi ghi. Chống trùng dòng theo id + thời gian.
- Escape toàn bộ nội dung trong email. Chừa quota Gmail (~10 email).

**Bản tin:**
- Dashboard soạn bản tin rồi gửi theo đợt, tối đa ~80 email mỗi lần. Chỉ gửi cho người đăng ký **trước** thời điểm tạo bản tin.
- Có nút "Gửi tiếp" cho phần còn lại, chống bấm gửi trùng.
- Mỗi email có link huỷ đăng ký.

**Đánh giá:** khách gửi tên, SĐT (không bắt buộc), dịch vụ (không bắt buộc), số sao 1–5, nội dung. Trạng thái `pending`, giới hạn 3 lần/giờ.

---

## 8. Dashboard quản trị (`/admin`)

- **Đăng nhập:**
  - Admin đầu tiên tạo từ `ADMIN_PASSWORD` (≥ 8 ký tự); nếu bỏ trống thì sinh mật khẩu ngẫu nhiên và in ra log.
  - Giới hạn đăng nhập sai theo IP và theo tên đăng nhập, chỉ đếm lần sai.
  - Tạo lại session khi đăng nhập. Đăng xuất làm vô hiệu mọi phiên cũ (`session_version`).
- **Tổng quan:** số lead mới, người đăng ký, đánh giá chờ duyệt (badge trên menu), tình trạng kết nối Google.
- **Khách tư vấn:** lọc theo trạng thái / dịch vụ / ngày, đổi trạng thái, ghi chú, xuất CSV (chống CSV injection), đồng bộ lại Google Sheet.
- **Bản tin:** danh sách người đăng ký, soạn và gửi theo đợt, xem tiến độ.
- **Bài viết, Tour:** thêm / sửa / xoá, soạn Markdown có xem trước, tải ảnh (mã hoá lại WebP), giữ ảnh `/img/…` hoặc `/uploads/…`, nổi bật, thứ tự.
- **Đánh giá:** duyệt / ẩn / xoá. Thêm thủ công bắt buộc ghi nguồn và tích "xác nhận đánh giá thật".
- **Cài đặt:** hotline, Zalo, email, Facebook, Messenger, video giới thiệu (mp4 / YouTube / Drive), video teaser, bật/tắt và độ trễ popup. Chỉ nhận URL https hoặc đường dẫn nội bộ.
- **Tài khoản:** đổi mật khẩu. Chỉ chủ tài khoản (admin đầu tiên) được tạo / xoá admin khác.
- Mọi trang admin gửi `Cache-Control: no-store`.

---

## 9. Bảo mật

- **Bảo vệ request:**
  - CSRF token cho mọi POST.
  - Kiểm tra Origin cho API công khai; giới hạn tần suất (lead, đăng ký 5 lần/giờ, đánh giá 3 lần/giờ); giới hạn độ dài mọi trường.
  - SQL chỉ dùng tham số bind. Thoát HTML mọi dữ liệu người dùng trong EJS (`<%= %>`).
  - Chỉ dùng `<%- %>` cho icon cố định, include, JSON-LD đã escape và HTML đã sanitize.
- **Tệp tải lên:**
  - Chỉ nhận JPG / PNG / WEBP, kiểm tra bằng `sharp` rồi mã hoá lại.
  - Thư mục `/uploads` gửi CSP `sandbox` + `nosniff`, không cho đi ngược thư mục.
- **Đường dẫn ảnh do admin nhập:** chỉ nhận dạng `^/(img|uploads|media)/[\w./-]+$`, để không chèn được CSS qua `url()`.
- **Helmet CSP:** script chỉ từ chính site; ảnh từ site, flagcdn, Google; media từ site và https; frame cho YouTube, Drive, Google Maps.
- **Secret:**
  - `SESSION_SECRET` bắt buộc ở production: ≥ 32 ký tự và không phải chuỗi mẫu.
  - `.env.example` để trống secret. Cookie `httpOnly`, `sameSite=lax`, `secure` ở production.
- **Lỗi:** bắt lỗi async (không để server sập), có trang 404 / 500, ghi log `unhandledRejection`.

---

## 10. Hiệu năng, tiếp cận (a11y) và SEO

- **Hiệu năng:**
  - Video nền chỉ tải trên màn hình ≥ 768px (điện thoại chỉ hiện ảnh poster), `preload="none"`, có `faststart`. Video montage < 1MB.
  - Ảnh có `width` / `height` và `loading="lazy"` (trừ ảnh đầu trang).
  - Cache: CSS / JS gắn `?v=` thì cache 1 năm `immutable`; ảnh / video 30 ngày. Bật nén gzip.
- **Tiếp cận:**
  - Có link "Bỏ qua đến nội dung", mỗi trang một `h1`.
  - Ảnh trang trí dùng `alt=""`. Nhãn `for` cho mọi ô nhập; lỗi gắn `aria-invalid` và `aria-describedby`.
  - Modal có bẫy focus, Esc để đóng, focus vào ô đầu tiên. Nút lọc có `aria-pressed`.
  - Tương phản chữ ≥ 4.5:1 kể cả trên ảnh nền / video. Viền focus rõ.
- **SEO:**
  - Title và description riêng cho từng trang, Open Graph (`og-image.jpg`).
  - JSON-LD `TravelAgency` (tên, địa chỉ, SĐT, giờ làm). Có `sitemap.xml` và `robots.txt`; chặn `/admin`.

---

## 11. Tiếng Việt: không ngắt dòng giữa từ ghép

Tiếng Việt viết tách từng âm tiết, nên trình duyệt có thể ngắt "chuyên | nghiệp" ra hai dòng. Cách xử lý:

- **Middleware sau khi render** (chỉ trang công khai, bỏ qua `/admin`): duyệt phần **chữ hiển thị** của HTML, bỏ qua thẻ, thuộc tính và khối `script` / `style` / `textarea` / `pre`. Nối các từ ghép trong danh sách bằng khoảng trắng không ngắt `U+00A0`.
- **Danh sách khoảng 220 từ ghép thường dùng:** chuyên nghiệp, dịch thuật, dịch vụ, công chứng, hộ chiếu, hồ sơ, du lịch, tư vấn, miễn phí, trọn gói, lãnh sự, hợp pháp, Đà Nẵng, Trung Quốc, Hàn Quốc, Nhật Bản, Châu Âu, Hội An, Bà Nà, Ngũ Hành Sơn, Vạn Lý Trường Thành, giấy tờ, thời gian, xét duyệt, làm việc, nhập cảnh, khách hàng, máy bay, đưa đón, bảo hiểm, văn phòng, liên hệ, bảng giá, báo giá…
- **Từ chồng nhau** như "Ngũ Hành" + "Hành Sơn": chỉ thay khoảng trắng giữa 2 âm tiết và dùng lookahead cho âm tiết sau, để nối được cả cụm.
- **Số + đơn vị** luôn đi liền: "10 ngày", "5 năm", "4 chỗ".
- **CSS:** `h1, h2, h3 { text-wrap: balance }`, `p, li { text-wrap: pretty }`.
- Dropdown `<option>` phải có `value` cố định, để giá trị gửi đi không bị đổi bởi ký tự nối.

---

## 12. Môi trường, triển khai, bản xem trước và kiểm thử

**Biến môi trường** (`.env.example`):
```
NODE_ENV=production
PORT=3000
SESSION_SECRET=            # ≥ 32 ký tự ngẫu nhiên
ADMIN_USERNAME=admin
ADMIN_PASSWORD=            # ≥ 8 ký tự
GOOGLE_SCRIPT_URL=         # URL web app Apps Script
GOOGLE_SCRIPT_SECRET=      # trùng TRIP_SECRET trong Script Properties
DATA_DIR=/var/data         # database + ảnh tải lên
SITE_URL=https://tripdn.com
```

**Các bước triển khai:**
- Render: `render.yaml` (web service Node, gắn disk vào `/var/data`, health check `/robots.txt`), sau đó gắn tên miền tripdn.com.
- Viết `docs/HUONG-DAN-GOOGLE-SHEET.md`: hướng dẫn tạo Apps Script, đặt `TRIP_SECRET`, deploy web app, dán URL vào `.env`, bấm "Kiểm tra kết nối" trong Dashboard.

**Bản xem trước tĩnh** (`npm run export:preview`):
- Render mọi trang công khai với database tạm, đổi đường dẫn sang base `/tripcompany` (cả `href`, `src`, `poster`, `data-src`, `url('…')`), gắn `data-preview` để khoá form, rồi chép `public/`.
- Chỉ cho xuất vào `dist-preview`, không bao giờ chép database, `.env` hay trang admin.
- Đăng bản này lên nhánh `gh-pages`.

**Kiểm thử** (`npm test`, test tích hợp chạy với database tạm và Apps Script giả có kiểm tra HMAC). Cần có ít nhất:
- Các trang công khai trả 200, trang sai trả 404.
- Gửi lead hợp lệ / sai SĐT / thiếu CSRF / quá giới hạn tần suất; đồng bộ Google đúng chữ ký.
- Đăng ký bản tin không lộ email đã tồn tại; huỷ đăng ký cần POST.
- Đánh giá vào trạng thái chờ duyệt.
- Đăng nhập sai bị khoá; đăng xuất làm vô hiệu phiên cũ.
- Tải ảnh giả mạo bị từ chối.
- Bản tin không gửi cho người đăng ký sau khi bản tin được tạo.

---

## 13. Tiêu chí nghiệm thu

- [ ] Mọi mục menu mở trang riêng; trang chủ chỉ có phần nổi bật.
- [ ] Giá chỉ là giá khách lẻ, lấy từ một nguồn dữ liệu, nhất quán giữa mọi trang; không có Net / COM / chính sách hoàn phí / đánh giá giả.
- [ ] Gửi form → có dòng mới trong Google Sheet và email tới 2 địa chỉ; Dashboard thấy lead.
- [ ] Popup bản tin hoạt động đúng điều kiện; gửi bản tin theo đợt và huỷ đăng ký được.
- [ ] Không tràn ngang ở 360 – 1920px; menu điện thoại mở / đóng được; tab Bảng giá và link `#` đúng.
- [ ] Điện thoại không tải video; mỗi trang dưới khoảng 1.5MB trên điện thoại.
- [ ] Không có từ ghép tiếng Việt nào bị ngắt dòng ở tiêu đề và nội dung chính.
- [ ] Không có lỗi trong console; `npm test` đạt 100%.
- [ ] Không có secret trong mã nguồn; `SESSION_SECRET` yếu hoặc là chuỗi mẫu thì server từ chối khởi động ở production.
