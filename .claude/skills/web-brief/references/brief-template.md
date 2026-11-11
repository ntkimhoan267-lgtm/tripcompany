# PROMPT XÂY DỰNG WEBSITE <TÊN DOANH NGHIỆP>

> Bản mô tả để duyệt trước khi code. Nguồn: <liệt kê tài liệu>. Phần tham khảo lấy từ <n> website đối thủ (xem 02-doi-thu.md).
> Ngày · Trạng thái: nháp / đã duyệt · Người duyệt

## 1. Bối cảnh doanh nghiệp
| Mục | Nội dung | Nguồn |
|---|---|---|
| Tên pháp lý | | |
| Mã số thuế | | |
| Người đại diện | | |
| Slogan | | |
| Địa chỉ hiển thị | | |
| Hotline chính · Zalo | | |
| Email | | |
| Giờ làm việc | | |
| Mạng xã hội (FB, Zalo OA, TikTok, Maps) | | |
**Nhân sự phụ trách theo mảng** (hiện ở khung "gọi trực tiếp"): …
**Thế mạnh (3–5 gạch đầu dòng, từ SWOT/TOWS hoặc phỏng vấn chủ):** …

## 2. Sản phẩm / dịch vụ
### Trọng tâm 1: … (chi tiết, các gói, giá "từ")
### Trọng tâm 2: …
### Dịch vụ khác: …
> ⚠️ Quy tắc giá: chỉ hiển thị giá công khai. Không bao giờ đưa <giá nội bộ / hoa hồng / chính sách nội bộ> lên web.

## 3. Mục tiêu website (xếp ưu tiên)
1. …  2. …  3. …  4. …

## 4. Nhận diện và UX/UI
- Màu: chính `#…` · chữ/nền đậm `#…` · nền nhạt `#…` · nhấn CTA `#…`
- Font: tiêu đề … · nội dung … (hỗ trợ tiếng Việt)
- Phong cách: … · Hoạ tiết từ logo: …
- Mobile-first · Thanh liên hệ cố định: Gọi, Zalo, Messenger, "<CTA chính>"
- Ngôn ngữ: tiếng Việt (giai đoạn 1); cấu trúc sẵn thêm tiếng Anh

### Học từ đối thủ
| Đối thủ | Lấy | Tránh |
|---|---|---|

### Yêu cầu rút ra (10–15 dòng, ghi học từ ai)

## 5. Sơ đồ trang (sitemap)
```
/                      Trang chủ
/gioi-thieu
/dich-vu  /dich-vu/<slug>
/bang-gia
/blog  /blog/:slug
/lien-he
/admin
```
**Menu chính:** …  **[CTA]**

## 6. Trang chủ: các section (đánh số)

## 7. Form và popup
**A. Popup email** (điều kiện hiện, tần suất, trường)
**B. Form tư vấn/đặt lịch** (trường *, dropdown giá trị cố định, chống spam)
**Luồng dữ liệu:** Website → DB → Google Apps Script → Sheet "<tên>" (tab…) → email tới …

## 8. Backend
Công nghệ · API · Bảo mật (hash mật khẩu, session, CSRF, rate limit, helmet, validate) · SEO (meta, OG, sitemap, robots, schema, URL không dấu)

## 9. Dashboard (`/admin`): module & phân quyền

## 10. Nội dung khởi tạo (bài viết mẫu, sản phẩm mẫu; thiếu giá ghi "Liên hệ")

## 11. Triển khai (repo, hosting, tên miền, Apps Script, sao lưu)

## ❓ Cần xác nhận (đánh số, có phương án mặc định)
