# Kiến trúc mẫu (rút từ tripcompany)

## Thư mục
```
server.js                 # tạo app, middleware, mount routes, nowrap tiếng Việt, healthz, graceful shutdown
src/config.js             # đọc env, kiểm tra SESSION_SECRET/ADMIN_PASSWORD, DATA_DIR, SITE_URL, TRUST_PROXY
src/db.js                 # node:sqlite, tạo bảng + migration tự động, prepared statements
src/seed.js               # dữ liệu khởi tạo (bài mẫu, tour mẫu) chỉ chèn 1 lần
src/data/company.js       # thông tin công ty, nhân sự, số liệu đã xác nhận
src/data/services.js      # danh mục dịch vụ, giá công khai, dropdown lead
src/data/articles/*.md    # bài viết khởi tạo
src/lib/security.js       # csrf, requireAdmin, requireOwner, rate limit, lockout
src/lib/google.js         # gọi Apps Script có HMAC, timeout, retry nhẹ
src/lib/media.js          # upload, sharp → webp srcset, magic bytes, dọn ảnh thừa
src/lib/catalog.js        # gộp giá mặc định + giá sửa trong DB, tính giá "từ"
src/lib/offer.js          # ưu đãi (giá niêm yết = giá thật + X, mở khoá khi để lại SĐT/email)
src/lib/toc.js            # mục lục bài viết từ ##/###, slug tiêu đề
src/lib/nowrap.js         # nối từ ghép tiếng Việt bằng U+00A0
src/lib/lifecycle.js      # graceful shutdown, đếm request đang chạy
src/lib/helpers.js        # format tiền, ngày, slug không dấu, validate SĐT VN
src/routes/public.js      # trang công khai, sitemap, robots, redirects 301
src/routes/api.js         # /api/leads, /api/subscribe, /api/reviews, /api/offer
src/routes/admin.js       # dashboard
views/partials/*          # head, header, footer, lead-form, offer-bar, page-hero, cards, stats, toc
views/pages/*             # home, about, services, service-*, pricing, tours, tour-detail, blog, post, contact, reviews, 404
views/admin/*             # login, dashboard, leads, subscribers, newsletter, posts, post-form, tours, prices, media, settings, account, reviews
public/css/site.css admin.css · public/js/site.js admin.js · public/img · public/media
google-apps-script/Code.gs
scripts/export-static.js build-images.js reset-password.js restore-backup.js
test/*.test.js test/browser/*.browser.js
render.yaml .env.example README.md docs/
```

## Bảng DB tối thiểu
users(id, username, password_hash, role owner|staff, session_version, failed_logins, locked_until)
leads(id, name, phone, service, note, source_path, status new|contacting|won|lost, admin_note, created_at, synced)
subscribers(id, email, name, status active|offer_only|unsubscribed, token, created_at)
newsletters(id, subject, body, sent_at, stats json) · newsletter_sends(newsletter_id, subscriber_id, state sent|failed|unknown)
posts(id, slug, title, excerpt, body_md, cover, cover_alt, seo_title, seo_desc, keyword, faq json, layout, accent, noindex, status, publish_at, updated_at)
redirects(from_path, to_path) · items/tours(id, slug, name, days, price, image, tags, body, status)
prices(group_key, rows json, updated_at) · settings(key, value) · media(key, image, video, poster)
reviews(id, name, rating, body, status pending|approved, created_at)

## Middleware theo thứ tự
helmet (CSP cho fonts/maps/video) → compression → static có cache (`?v=` 1 năm immutable; ảnh 30 ngày)
→ cookie session (httpOnly, sameSite=lax, secure ở prod) → csrf → rate limit (form, login) → locals
(company, settings, siteUrl, path, assetV, offerUnlocked) → routes → nowrap (chỉ public) → 404 → error.

## Google Apps Script
POST `{payload, sig}`; sig = HMAC-SHA256(payload, SECRET). Action: lead, subscribe, unsubscribe,
newsletter (recipients[], chừa hạn mức MailApp.getRemainingDailyQuota), ping (Kiểm tra kết nối).
Trả `{ok, sent[], sheetUrl, error}`. Sheet tự tạo lần đầu; ID lưu Script Properties.

## Bảo mật (danh sách TRIP đã áp dụng)
- Mật khẩu scrypt; nâng cấp hash ở lần đăng nhập đúng kế tiếp.
- Khoá đăng nhập: 10 lần/15 phút mỗi IP, 100 lần/giờ mỗi tài khoản.
- Phiên "stateless" nhưng đối chiếu DB mỗi request: user tồn tại, session_version khớp, chưa quá 7 ngày.
- CSRF token so sánh timing-safe; API JSON nhận header X-CSRF-Token.
- TRUST_PROXY đếm vị trí IP thật trong X-Forwarded-For (từ cuối); endpoint tạm `/__ip` để kiểm tra, xoá sau.
- Upload: kiểm magic bytes, giới hạn 40MB video / vài MB ảnh, tên file ngẫu nhiên.
- Không lộ email đã đăng ký (subscribe luôn trả "đã nhận"); huỷ đăng ký cần POST + token.
- Sao lưu .zip không chứa mật khẩu; khôi phục bằng script có hướng dẫn.

## Test tối thiểu (`npm test`)
- Trang công khai 200, sai 404, sitemap có lastmod.
- Lead: hợp lệ / sai SĐT / thiếu CSRF / quá rate limit / Google lỗi vẫn lưu DB; HMAC đúng.
- Subscribe không lộ email; unsubscribe cần POST.
- Review vào pending. Login sai bị khoá; logout vô hiệu phiên cũ; staff không vào trang owner.
- Upload giả bị từ chối. Newsletter không gửi cho người đăng ký sau khi tạo; không gửi trùng.
- Bảng giá sửa trong Dashboard phản ánh ra trang; ưu đãi mở khoá đúng; 301 khi đổi slug.
- Apps Script: test logic hạn mức Gmail bằng mock (test/apps-script.test.js).
- Browser (Playwright): menu điện thoại focus/inert/Esc, popup trả focus, Dashboard không tràn ngang.
