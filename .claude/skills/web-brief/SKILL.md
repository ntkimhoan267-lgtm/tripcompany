---
name: web-brief
description: >-
  Bước 3 của quy trình xây website – viết bản brief/prompt đầy đủ để duyệt TRƯỚC khi code (giống
  docs/PROMPT-WEBSITE-TRIP.md): thông tin doanh nghiệp, mục tiêu xếp ưu tiên, dịch vụ & bảng giá
  công khai, bảng Lấy/Tránh từ đối thủ, sitemap, section trang chủ, form & luồng dữ liệu, dashboard,
  nội dung khởi tạo, triển khai, danh sách "cần xác nhận". Dùng khi người dùng nói "viết brief", "mô
  tả website", "prompt để xây web", "sitemap", "cần những trang gì", hoặc khi bước 1–2 đã xong và
  cần chốt phạm vi.
---

# Brief website (duyệt trước khi code)

Brief là hợp đồng giữa Claude và chủ doanh nghiệp: mọi thứ code ra phải truy được về một dòng trong
brief. Ở TRIP, brief 11 mục + 6 câu hỏi xác nhận đã giúp tránh làm lại: địa chỉ nào hiển thị,
hotline chính, chính sách hoàn phí không đưa lên web, video nén ra sao.

Kết quả: `docs/website/03-brief.md`. Đọc `references/brief-template.md` và điền đủ mọi mục;
mục nào chưa có thông tin thì ghi "CẦN XÁC NHẬN" chứ không bỏ trống hay đoán.

## Cách viết từng phần

1. **Bối cảnh doanh nghiệp**: lấy từ giấy phép/bảng giá/bộ nhận diện người dùng gửi. Ghi nguồn
   từng dòng (ví dụ "theo HĐ CTV 2024"). Khi hai nguồn mâu thuẫn (TRIP: 2 địa chỉ), đưa cả hai vào
   mục "cần xác nhận".
2. **Dịch vụ & giá**: chia "trọng tâm" (1–2 dịch vụ chính, có trang riêng + nội dung sâu) và
   "dịch vụ khác" (lưới icon). Ghi rõ **quy tắc giá**: chỉ giá công khai; giá "từ" cho mỗi nhóm;
   ghi chú biến động ("giá có thể thay đổi theo ĐSQ"). Giá phải nằm trong một file dữ liệu duy nhất.
3. **Mục tiêu xếp ưu tiên** (3–4 dòng, đánh số): mục tiêu số 1 quyết định hero, CTA và form.
4. **Nhận diện & UX**: màu lấy từ logo (mã hex), font hỗ trợ tiếng Việt, phong cách 3 từ, mobile-first,
   thanh liên hệ nổi, ngôn ngữ (giai đoạn 1 tiếng Việt, cấu trúc sẵn cho tiếng Anh).
5. **Học từ đối thủ**: dán bảng Lấy/Tránh từ `02-doi-thu.md`, kèm 10–15 yêu cầu cụ thể.
6. **Sitemap**: cây URL tiếng Việt không dấu, mỗi mục menu là một trang riêng (TRIP: ban đầu gộp
   trang chủ dài, sau phải tách – nên tách ngay từ đầu). Trang chủ chỉ giữ phần nổi bật.
7. **Section trang chủ**: đánh số 10–13 section theo thứ tự kéo xuống, mỗi section 1–2 dòng mô tả
   và dữ liệu nó cần. Mẫu TRIP: header → hero video + form → dải tin cậy → 2 dịch vụ trọng tâm →
   thẻ nổi bật → bảng giá rút gọn → quy trình 4 bước → dịch vụ khác → sản phẩm nổi bật → vì sao chọn
   → blog → CTA cuối + bản đồ → footer có dòng minh bạch.
8. **Form & popup**: liệt kê trường (bắt buộc đánh *), dropdown có giá trị cố định, chống spam,
   và **sơ đồ luồng dữ liệu** (Website → DB → Google Sheet → email), ai nhận email.
9. **Backend & dashboard**: liệt kê module Dashboard theo người dùng thật sẽ dùng (chủ vs nhân viên):
   tổng quan, khách, đăng ký nhận tin, bản tin, bài viết, sản phẩm/tour, bảng giá & ưu đãi, ảnh &
   video, cài đặt, tài khoản. Nêu phân quyền.
10. **Nội dung khởi tạo**: 3 bài blog mẫu theo từ khoá bước 1, sản phẩm/tour mẫu, trang giới thiệu.
    Ghi "Liên hệ" cho giá chưa có, không bịa.
11. **Triển khai**: repo, hosting đề xuất (Render ~7 USD/tháng có ổ đĩa; hoặc VPS), tên miền,
    Google Apps Script cho Sheet/Gmail.
12. **Cần xác nhận**: 5–10 câu hỏi đánh số, mỗi câu có phương án mặc định nếu không trả lời.

## Sau khi người dùng duyệt

- Cập nhật brief theo câu trả lời, đổi trạng thái "đã duyệt" và ghi ngày.
- Mọi thay đổi phạm vi sau này đều sửa brief trước, code sau. Khi dự án lớn lên, tạo
  `docs/PROMPT-XAY-DUNG-WEBSITE-<TÊN>.md` mô tả đúng phiên bản hiện tại (như TRIP) để người khác
  hoặc AI khác xây lại được.
