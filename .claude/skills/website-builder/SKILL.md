---
name: website-builder
description: >-
  Quy trình trọn gói xây website cho doanh nghiệp ở BẤT KỲ ngành nào (du lịch/visa, nhà hàng, phòng
  khám, spa, bất động sản, giáo dục, bán lẻ, dịch vụ B2B, luật/kế toán...) đi từ nghiên cứu thị
  trường → chọn 3–5 đối thủ cùng khách hàng mục tiêu có REACH cao nhất để học → brief → thiết kế →
  code → kiểm tra nhiều vòng → triển khai → bàn giao. Luôn dùng skill này khi người dùng nói "làm
  website", "xây web", "thiết kế web", "landing page", "web cho công ty/quán/phòng khám của tôi",
  "làm lại website", kể cả khi họ chỉ mô tả doanh nghiệp và chưa biết bắt đầu từ đâu. Skill này là
  bản điều phối; nó chỉ ra skill con (web-market-research, web-competitor-research, web-brief,
  web-design, web-build, web-content-seo, web-qa, web-launch) cần chạy ở từng bước.
---

# Website Builder – quy trình điều phối

Bộ skill này rút ra từ quá trình xây website TRIP (tripdn.com: visa, dịch thuật, tour tại Đà Nẵng)
và được viết lại để dùng cho mọi ngành. Nguyên tắc cốt lõi: **website là công cụ bán hàng**, nên mọi
bước đều hướng về mục tiêu kinh doanh số 1 của chủ doanh nghiệp (thường là thu khách hàng tiềm năng),
và **không bao giờ bịa** số liệu, đánh giá, giá hay cam kết mà chủ doanh nghiệp chưa xác nhận.

## Khi bắt đầu

1. Hỏi (hoặc đọc từ tài liệu người dùng gửi) 5 điều tối thiểu: ngành & sản phẩm/dịch vụ chính,
   khu vực hoạt động, khách hàng mục tiêu, mục tiêu số 1 của website, ngân sách/thời gian.
   Nếu người dùng nói "tôi không rõ", đừng dừng lại: tự nghiên cứu (bước 1–2) rồi đề xuất, họ chỉ cần duyệt.
2. Đọc `references/industries.md` để lấy preset của ngành (trang cần có, form thu lead, tín hiệu tin cậy,
   quy tắc pháp lý). Nếu ngành không có trong danh sách, chọn ngành gần nhất và ghi rõ khác biệt.
3. Tạo thư mục `docs/website/` trong dự án và lưu **mọi** kết quả theo tên file ở bảng dưới.
   Người dùng thường không xem transcript; file là thứ họ đọc và duyệt.

## 8 bước và điều kiện chuyển bước

| # | Bước | Skill | File kết quả trong `docs/website/` | Chỉ sang bước sau khi |
|---|---|---|---|---|
| 1 | Nghiên cứu thị trường & khách hàng | `web-market-research` | `01-thi-truong.md` | Có chân dung khách hàng, từ khoá họ tìm, kênh họ dùng |
| 2 | Chọn 3–5 đối thủ REACH cao nhất và học | `web-competitor-research` | `02-doi-thu.md` + `02-doi-thu.csv` | Có bảng "Lấy / Tránh" cho từng đối thủ |
| 3 | Brief: mục tiêu, sitemap, nội dung, dữ liệu | `web-brief` | `03-brief.md` | Người dùng duyệt brief và trả lời mục "Cần xác nhận" |
| 4 | Thiết kế giao diện | `web-design` | `04-thiet-ke.md` (+ bản xem trước) | Người dùng chốt màu, font, bố cục trang chủ |
| 5 | Code website + dashboard | `web-build` | mã nguồn, `README.md` | `npm test` đạt, mọi trang trong sitemap mở được |
| 6 | Nội dung & SEO | `web-content-seo` | nội dung thật trong code/DB | Mỗi trang có title/description riêng, sitemap.xml, schema |
| 7 | Kiểm tra nhiều vòng | `web-qa` | `07-kiem-tra.md` | 5 vòng kiểm tra xong, danh sách lỗi = 0 hoặc được chấp nhận |
| 8 | Triển khai & bàn giao | `web-launch` | `08-trien-khai.md`, hướng dẫn Cowork | Website chạy trên tên miền thật, form về đúng Sheet/email |

Các bước 1–3 có thể gộp trong một ngày làm việc nếu doanh nghiệp nhỏ. Bước 7 không được bỏ:
ở TRIP, 5 vòng kiểm tra đã tìm ra hơn 40 lỗi mà vòng code đầu không thấy.

## Quy tắc xuyên suốt (học từ TRIP)

- **Một nguồn dữ liệu cho giá và thông tin công ty** (`src/data/company.js`, `src/data/services.js`
  hoặc tương đương). Trang nào cũng đọc từ đó; không gõ cứng giá trong template.
- **Chỉ đưa thông tin công khai**: không giá đại lý, hoa hồng, chính sách nội bộ, dữ liệu khách.
- **Không bịa**: số liệu thành tích, đánh giá, feedback, logo đối tác chỉ hiện khi chủ doanh nghiệp
  cung cấp và xác nhận. Khi thiếu, để chỗ trống có ghi chú "cần xác nhận", không điền tạm.
- **Mobile-first**: đa số khách Việt Nam vào từ Facebook/Zalo trên điện thoại. Thanh liên hệ nổi
  (Gọi, Zalo, Messenger, nút tư vấn) có mặt ở mọi trang.
- **Tiếng Việt có dấu** toàn bộ, kể cả thông báo lỗi và nội dung Dashboard. Xử lý không ngắt dòng
  từ ghép (xem `web-design`).
- **Mọi lần người dùng cần làm việc trên trình duyệt** (DNS, Google, hosting): viết thành tài liệu
  giao việc cho Cowork theo mẫu trong `web-launch`, có quy tắc không nhập mật khẩu, không tự thanh toán.
- **Cuối mỗi bước**: ghi rõ "Cần người dùng xác nhận" thành danh sách đánh số. Người dùng trả lời
  bằng số là đủ.

## Chọn độ sâu theo quy mô

- **Landing page 1 trang** (quảng cáo, sự kiện): bước 1–2 rút gọn (1 giờ), bỏ Dashboard, form gửi
  thẳng Google Sheet. Vẫn làm bước 7 (vòng giao diện + bảo mật form) và 8.
- **Website công ty 5–15 trang** (mặc định): toàn bộ 8 bước.
- **Có bán hàng/đặt lịch online**: thêm phần thanh toán/đặt lịch trong brief; `web-build` có mục riêng.

## Khi quay lại dự án cũ

Đọc `docs/website/` theo thứ tự để nạp lại bối cảnh, rồi mới sửa. Khi thêm tính năng lớn
(bảng giá sửa được, ưu đãi, bài viết SEO...), lặp lại bước 3 (brief phần mới) → 5 → 7 → 8 và viết
tài liệu cập nhật cho Cowork như `docs/COWORK-CAP-NHAT-*.md` của TRIP.
