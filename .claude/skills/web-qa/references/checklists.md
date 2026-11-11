# Checklist chi tiết từng vòng

## Vòng 1 – Giao diện
- 360/390/768/1024/1300/1920: không scroll ngang (`document.documentElement.scrollWidth <= innerWidth`).
- Hero: tiêu đề đọc được trên ảnh/video (lớp phủ), CTA thấy ngay không cần cuộn trên điện thoại.
- Thẻ: ảnh cùng tỉ lệ, tiêu đề không tràn, "Giá từ" có đơn vị.
- Bảng giá: tab đúng, bảng dài → thẻ dọc trên điện thoại.
- Thanh nổi không che nút gửi form / footer; ẩn khi popup mở.
- Từ ghép tiếng Việt: kiểm tra tiêu đề h1–h3 mọi trang bằng ảnh chụp.
- Font tải đúng (không fallback), dấu tiếng Việt không bị cắt (line-height).
- Trạng thái: hover, focus rõ, nút disabled, thông báo lỗi/thành công của form.
- Dashboard: bảng rộng cuộn trong khung, không tràn trang; form sửa có nút lưu thấy được.

## Vòng 2 – Backend & bảo mật
- POST không CSRF → 403; sai SĐT → 400 có thông báo tiếng Việt; honeypot điền → giả vờ thành công.
- Rate limit: 6 lần/phút form, login 10 lần/15 phút; thông báo rõ.
- Apps Script giả trả lỗi/null/timeout → lead vẫn trong DB, `synced=0`, có nút gửi lại.
- Đăng nhập: hash mạnh; đổi mật khẩu/đăng xuất → cookie cũ vô hiệu; staff không mở trang owner (403).
- Upload: file .php đổi đuôi .jpg bị từ chối; ảnh quá lớn bị từ chối; tên file ngẫu nhiên.
- Không lộ: email đã đăng ký, stack trace, phiên bản Express, đường dẫn tuyệt đối.
- Secret: grep `password|secret|token` trong repo; `.env` không commit; `SESSION_SECRET` mẫu → từ chối chạy.
- Header: helmet CSP không chặn fonts/maps/video; HSTS khi HTTPS; cookie secure/sameSite.
- TRUST_PROXY: `/__ip` trả IP thật khi qua Render/Cloudflare; xoá endpoint sau khi kiểm.
- Graceful shutdown: SIGTERM chờ request xong; `/healthz` kiểm ghi ổ đĩa.

## Vòng 3 – Nội dung & dữ liệu
- Grep mọi số tiền trong `views/`: phải đến từ data/catalog, không gõ cứng.
- Mô tả Google của trang dịch vụ khớp giá hiện tại.
- Grep từ cấm theo ngành: "cam kết 100%", "chữa khỏi", "lợi nhuận", "giá đại lý", "hoàn phí" (nếu chưa chốt).
- Số liệu thành tích, feedback, logo đối tác: có xác nhận bằng văn bản/ảnh chụp từ chủ doanh nghiệp.
- Thông tin pháp lý (lệ phí, thời hạn, văn bản): có ngày đối chiếu; nguồn chính thống.
- Chính tả, dấu câu, xưng hô nhất quán; không câu tiếng Anh lẫn.
- Link: nội bộ không 404, ngoài có `rel="noopener"`; số điện thoại `tel:` đúng; Zalo/Messenger mở đúng.
- 404 thân thiện; trang cảm ơn noindex.

## Vòng 4 – Tiếp cận & hiệu năng
- Một h1/trang; thứ tự heading không nhảy cấp; link "Bỏ qua đến nội dung".
- Mọi input có label; lỗi có aria-invalid + aria-describedby; nút icon có aria-label.
- Modal: focus trap, Esc, trả focus; menu: inert nội dung sau.
- Tương phản ≥ 4.5:1 (kể cả chữ trên ảnh); focus ring thấy được.
- Lighthouse mobile: Performance ≥ 80, A11y ≥ 95, SEO ≥ 95.
- Ảnh có width/height, lazy, WebP srcset; video preload none, chỉ tải ≥ 768px.
- Tổng dung lượng trang chủ mobile < 1.5MB; CSS/JS cache 1 năm với `?v=`.

## Vòng 5 – Trình duyệt thật (Playwright)
- 390 & 768: mở menu → focus vào menu, Tab 40 lần không lọt, Esc đóng và focus về nút, bấm "Tư vấn" trong menu → menu đóng, popup mở, focus ô đầu; phóng to cửa sổ → menu tự đóng.
- Gửi form thật tới Apps Script giả: Dashboard hiện lead, trạng thái đổi được, CSV tải được.
- Tắt JavaScript: form vẫn gửi, hiện trang cảm ơn.
- Dashboard 1024px: trang Khách/Đánh giá/Bài viết không tràn ngang; form bài viết chấm điểm SEO realtime.
- Ưu đãi/popup: để lại SĐT → giá gạch, tải lại trang vẫn giữ; không tạo lead trùng trong 24h.
