---
name: web-content-seo
description: >-
  Bước 6 của quy trình xây website – viết nội dung thật và làm SEO cho website doanh nghiệp: trang
  dịch vụ theo từ khoá hành động, bài blog theo từ khoá tìm hiểu, title/description từng trang, Open
  Graph, schema.org (LocalBusiness theo ngành, BlogPosting, FAQPage, BreadcrumbList), sitemap.xml,
  robots.txt, 301, mục lục bài viết, khung chấm điểm SEO trong Dashboard, quy tắc viết cho nhân
  viên, Google Search Console. Dùng khi người dùng nói "viết nội dung", "bài viết chuẩn SEO", "lên
  top Google", "meta title", "schema", "sitemap", "Search Console", "dặn nhân viên viết blog".
---

# Nội dung & SEO

Nội dung là lý do khách tin và Google xếp hạng. Mọi nội dung phải **đúng sự thật, có nguồn, có ngày
đối chiếu** với thông tin pháp lý/giá; không bịa số liệu hay feedback.

## 1. Trang dịch vụ (từ khoá hành động)
Mỗi dịch vụ trọng tâm 1 trang, cấu trúc: hero (lợi ích + địa phương + CTA) → giá "từ" lấy từ bảng
giá → các gói/bảng chi tiết → hồ sơ/điều kiện cần chuẩn bị → quy trình 4 bước → vì sao chọn →
FAQ (4–6 câu, schema FAQPage) → khung tư vấn + gọi trực tiếp. Title ≤ 60 ký tự có từ khoá +
thương hiệu; description 120–160 ký tự **tự lấy giá từ bảng giá** (không gõ cứng, TRIP từng lệch giá).

## 2. Bài viết (từ khoá tìm hiểu)
Quy tắc dặn nhân viên (đưa vào README/Dashboard):
1. Chọn **1 từ khoá chính** khách hay gõ (từ `01-thi-truong.md`).
2. Chia bài bằng `##` và `###`; website tự tạo mục lục "Nội dung chính". Không dùng `#`.
3. Tiêu đề Google 30–60 ký tự, mô tả Google 120–160 ký tự, có từ khoá.
4. Ảnh bìa có mô tả (alt); bài ≥ 800 chữ; 2–3 link tới trang dịch vụ; 1 link nguồn chính thống;
   ≥ 2 câu hỏi thường gặp.
5. Khung "Kiểm tra SEO" đạt ≥ 80/100 mới đăng. Chọn giao diện: bài hướng dẫn dài → "Hướng dẫn"
   (mục lục dính), bài ảnh đẹp → "Tạp chí".
6. Hẹn giờ đăng vào giờ khách online.
Nội dung pháp lý/y tế/tài chính: ghi số văn bản, ngày đối chiếu, và dòng "không thay thế tư vấn
chính thức". Không hứa kết quả thay cơ quan có thẩm quyền.

## 3. Khung chấm điểm SEO trong Dashboard (100 điểm)
Tiêu đề có từ khoá & độ dài (15) · mô tả (15) · từ khoá trong đoạn đầu (10) · ≥ 3 tiêu đề `##` (10)
· ≥ 800 chữ (10) · ảnh bìa + alt (10) · link nội bộ ≥ 2 (10) · link ngoài ≥ 1 (5) · FAQ ≥ 2 (10)
· slug ngắn không dấu (5). Hiện xem trước kết quả Google ngay khi gõ.

## 4. SEO kỹ thuật (kiểm tra bằng test)
- Mỗi trang: `<title>` riêng, description, canonical bỏ `/` cuối, OG (title, description, image
  1200×630, locale vi_VN), `article:published_time/modified_time` cho bài.
- JSON-LD: LocalBusiness con theo ngành (TravelAgency, Restaurant, MedicalClinic, RealEstateAgent,
  EducationalOrganization, Store, LegalService, ProfessionalService) với tên, địa chỉ, SĐT, giờ, MST,
  sameAs; BreadcrumbList mọi trang con; BlogPosting + FAQPage cho bài; Product/Offer cho sản phẩm có giá.
  Escape `<` thành `<` khi in JSON.
- `sitemap.xml` có lastmod từ DB; `robots.txt` chặn `/admin`, `/api`; `noindex` cho trang cảm ơn,
  tìm kiếm, bài ẩn; 301 tự động khi đổi slug đã đăng.
- URL tiếng Việt không dấu, ngắn, có từ khoá.
- Tốc độ: PageSpeed mobile ≥ 80; ảnh WebP, font swap, CSS gọn.

## 5. Sau khi lên mạng
Search Console: xác minh domain (bản ghi TXT, người dùng tự thêm), gửi sitemap, yêu cầu lập chỉ mục
bài mới, kiểm tra Rich Results. Google Business Profile: đồng bộ tên/địa chỉ/SĐT/giờ với website.
Lịch nội dung: 2–4 bài/tháng theo mùa vụ ở bước 1; mỗi quý rà lại giá và văn bản pháp luật trong bài.

## Kết quả
Nội dung nằm trong code/DB; ghi vào `docs/website/03-brief.md` mục 10 danh sách bài đã đăng, từ khoá,
ngày đối chiếu. Đọc `references/schema-examples.md` khi cần mẫu JSON-LD.
