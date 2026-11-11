---
name: web-build
description: >-
  Bước 5 của quy trình xây website – code website doanh nghiệp hoàn chỉnh (giao diện + backend +
  Dashboard quản trị) theo kiến trúc đã kiểm chứng ở TRIP: Node.js 22 + Express + EJS (render
  server, tốt SEO) + SQLite có sẵn trong Node, form lưu DB rồi đồng bộ Google Sheet/Gmail qua Google
  Apps Script (không cần Google Cloud), bảo mật (hash mật khẩu, session, CSRF, rate limit, helmet,
  validate, chống upload giả), Dashboard quản lý khách/bài viết/sản phẩm/bảng giá/ảnh/bản tin/tài
  khoản, sao lưu, test tự động. Dùng khi người dùng nói "code website", "làm backend", "dashboard
  quản trị", "form gửi về Google Sheet", "thêm tính năng X vào web", "bảng giá sửa được", "viết
  test", hoặc sau khi brief và thiết kế đã duyệt. Cũng dùng khi cần chọn stack khác
  (static/Next.js/WordPress) – xem references/alternatives.md.
---

# Code website + Dashboard

Kiến trúc mặc định là kiến trúc của TRIP vì đã qua 5 vòng kiểm tra và chạy thật. Đọc
`references/architecture.md` để lấy sơ đồ thư mục, bảng DB, middleware, module Dashboard và các
quyết định kỹ thuật kèm lý do. Khi dự án khác ngành, chỉ đổi **dữ liệu** (`src/data/*`), **trang**
(`views/pages/*`) và **module Dashboard** cần thiết; phần lõi (bảo mật, form, Google, SEO, media)
giữ nguyên. Nếu repo TRIP có sẵn trên máy, sao chép lõi từ đó thay vì viết lại.

## Thứ tự làm (mỗi mục xong thì chạy `npm test` rồi commit)

1. **Khung dự án**: `package.json` (Node ≥ 22.13, `node:sqlite`, express, ejs, helmet,
   cookie-session hoặc tương đương, multer, sharp), `.env.example`, `server.js`, `src/config.js`
   (từ chối khởi động ở production nếu `SESSION_SECRET` yếu/mẫu), `/healthz` kiểm tra ghi ổ đĩa,
   tắt máy chủ êm (chờ request đang chạy).
2. **Dữ liệu**: `src/data/company.js` (thông tin công ty, nhân sự theo mảng, số liệu đã xác nhận),
   `src/data/services.js` (danh mục + giá công khai, dropdown dịch vụ có giá trị cố định).
   Comment đầu file nhắc quy tắc "không đưa giá nội bộ".
3. **DB & migration**: `src/db.js` tạo bảng và **tự nâng cấp** khi khởi động (thêm cột/bảng mới
   nếu chưa có) để deploy không cần thao tác tay. Bảng tối thiểu: users, leads, subscribers,
   posts, items (tour/sản phẩm), settings, media, prices, redirects, reviews, newsletters.
4. **Trang công khai**: `views/partials/head.ejs` (meta, OG, canonical bỏ `/` cuối, JSON-LD
   LocalBusiness/ngành), header/footer/thanh nổi/popup; từng trang theo sitemap trong brief; 404.
5. **Form & API**: `POST /api/leads`, `POST /api/subscribe`, đánh giá (chờ duyệt). Validate SĐT
   VN, honeypot, rate limit theo IP, CSRF, lưu DB **trước** rồi mới gọi Google (lỗi Google không
   làm mất lead). Form vẫn gửi được khi tắt JavaScript (trang cảm ơn).
6. **Google Apps Script** (`google-apps-script/Code.gs`): nhận POST có chữ ký HMAC (`TRIP_SECRET`
   → đổi tên theo dự án), tự tạo Sheet + tab, chia sẻ cho email chủ, gửi email thông báo, gửi bản
   tin theo đợt (≤ 60 người/đợt, chừa hạn mức Gmail), huỷ đăng ký. Viết `docs/HUONG-DAN-GOOGLE-SHEET.md`.
7. **Dashboard** `/admin`: đăng nhập (hash scrypt/argon2, khoá sau N lần sai, phiên vô hiệu khi
   đổi mật khẩu/đăng xuất), tổng quan + biểu đồ, khách (trạng thái, ghi chú, CSV), đăng ký nhận
   tin, bản tin (chống gửi trùng, đánh dấu "chưa rõ" khi mất kết nối), bài viết chuẩn SEO (xem
   `web-content-seo`), sản phẩm/tour, **bảng giá & ưu đãi** (chủ), **ảnh & video** (chủ), cài đặt
   (hotline, link mạng xã hội, bật/tắt popup, kiểm tra kết nối Google, sao lưu .zip, dọn ảnh
   thừa), tài khoản & phân quyền (chủ / nhân viên).
8. **Media**: upload qua multer + sharp → WebP nhiều cỡ; kiểm tra magic bytes (từ chối ảnh giả);
   giới hạn dung lượng; lưu ở `DATA_DIR/uploads`.
9. **SEO kỹ thuật**: `sitemap.xml` (lastmod), `robots.txt` chặn `/admin`, 301 khi đổi slug, trang
   lỗi thân thiện. Chi tiết ở `web-content-seo`.
10. **Test** (`npm test`, `node --test`): DB tạm + Apps Script giả có kiểm HMAC. Danh sách test
    tối thiểu trong `references/architecture.md` mục "Test". Thêm `test:browser` (Playwright) cho
    menu/popup/focus.
11. **Scripts**: `export-static.js` (bản xem trước tĩnh cho GitHub Pages, khoá form), `reset-password.js`,
    `restore-backup.js`, `build-images.js`.
12. **README** tiếng Việt: website có gì, chạy trên máy, biến môi trường, triển khai, sao lưu, video.

## Quy tắc code
- Mọi chuỗi hiển thị tiếng Việt có dấu, kể cả lỗi API và Dashboard.
- Không gõ cứng giá/hotline trong template; đọc từ data/DB/settings.
- Mỗi tính năng mới đi kèm test; sửa lỗi từ đợt kiểm tra thì test tái hiện lỗi trước.
- Không commit `.env`, DB, uploads; kiểm tra `.gitignore` không chặn nhầm `src/data/` (TRIP từng
  deploy lỗi vì `.gitignore` chặn thư mục `data/` bao gồm cả `src/data/`).
- Secret chỉ qua biến môi trường; ở production từ chối chạy khi thiếu/yếu.
- Commit message tiếng Việt, mô tả theo tính năng/lỗi.

## Khi thêm tính năng vào website đang chạy
Đọc `docs/website/03-brief.md` và README, viết phần brief bổ sung, code + test, rồi viết
`docs/COWORK-CAP-NHAT-<tên>.md` (mẫu trong `web-launch`) để người dùng kiểm tra trên web thật.
