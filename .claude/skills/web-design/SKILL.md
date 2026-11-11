---
name: web-design
description: >-
  Bước 4 của quy trình xây website – thiết kế giao diện cho website doanh nghiệp Việt Nam: hệ màu từ
  logo, font hỗ trợ tiếng Việt, bố cục trang chủ/trang con/thẻ sản phẩm/bảng giá theo tab, hero có
  ảnh-video-logo, thanh liên hệ nổi, popup, mobile-first, tiếp cận (a11y), không ngắt dòng từ ghép
  tiếng Việt, ảnh/video nhẹ. Dùng khi người dùng nói "thiết kế giao diện", "màu sắc/font", "bố cục
  trang chủ", "trang nhìn chưa đẹp", "làm lại hero", "giống web X", "mobile bị vỡ", hoặc ngay sau
  khi brief được duyệt.
---

# Thiết kế giao diện

Kết quả: `docs/website/04-thiet-ke.md` (quyết định thiết kế) và các token trong CSS. Thiết kế đi
trước code nhưng nên **xem bằng ảnh chụp thật** (Playwright, 390px và 1300px) chứ không mô tả suông:
ở TRIP, nhiều vòng sửa chỉ xuất hiện khi nhìn ảnh chụp.

## 1. Hệ màu và chữ
- Lấy 1 màu chính từ logo, 1 màu đậm cho chữ/nền, 1 nền nhạt, 1 màu nhấn CTA **tương phản** với
  màu chính (TRIP: xanh trời + navy + xám nhạt + cam san hô). Kiểm tra tương phản ≥ 4.5:1 cho chữ,
  kể cả chữ trên ảnh/video (thêm lớp phủ gradient).
- Font: tiêu đề và nội dung đều phải hỗ trợ tiếng Việt đầy đủ (Be Vietnam Pro, Inter, Lexend,
  Cormorant Garamond cho serif sang). Tải qua Google Fonts với `display=swap`, preconnect.
- Khai báo CSS variables: `--c-primary --c-dark --c-bg --c-accent --radius --shadow`; mọi component
  dùng biến, không gõ mã màu rải rác.

## 2. Bố cục chuẩn (đã kiểm chứng ở TRIP)
- **Header**: logo, menu ≤ 8 mục (dropdown cho nhóm), hotline, nút CTA. Trên điện thoại: burger,
  menu có bẫy focus, Esc đóng, `inert` phần nội dung phía sau.
- **Hero trang chủ**: tiêu đề nói đúng lợi ích + địa phương, 2 nút (CTA chính + phụ), form 3 trường
  ngay hero trên máy tính; ảnh/video nền chỉ tải ở ≥ 768px, điện thoại dùng poster.
- **Trang con**: hero có ảnh nền + logo + breadcrumb; nội dung chia section; cuối trang luôn có
  khung tư vấn + "gọi trực tiếp" nhân sự phụ trách.
- **Thẻ sản phẩm/tour/dịch vụ**: ảnh tỉ lệ cố định, badge (số ngày/nhãn), "Giá từ" + đơn vị,
  nút Chi tiết. Lưới 1 cột điện thoại, 2–3 cột máy tính.
- **Bảng giá**: dạng thẻ theo tab (mỗi nhóm 1 tab), ghi chú biến động, nút tư vấn trong từng thẻ;
  trên điện thoại bảng dài chuyển thành thẻ xếp dọc, không scroll ngang.
- **Thanh liên hệ nổi**: Gọi · Zalo · Messenger · CTA; không che nút quan trọng; ẩn khi popup mở.
- **Popup**: email (sau 15 giây hoặc rời trang, 1 lần/7 ngày), tư vấn (mở từ mọi nút), ưu đãi.
  Focus vào ô đầu, Esc đóng, trả focus về nút đã mở.
- **Footer**: pháp lý, MST, địa chỉ, giờ, mạng xã hội, liên kết, dòng minh bạch nếu ngành cần.

## 3. Ảnh & video
- Ảnh thật của doanh nghiệp > ảnh stock. Khi cần ảnh minh hoạ: Wikimedia Commons CC0/Public
  domain, Mixkit/Pexels (ghi nguồn + giấy phép trong `docs/`). Không lấy ảnh đối thủ.
- Chuyển WebP nhiều kích cỡ (`srcset`), có `width/height`, `loading="lazy"` trừ ảnh đầu trang.
- Video: teaser < 1MB (ngắn, không tiếng, lặp) + bản đầy đủ 720p mở trong modal; `preload="none"`,
  `faststart`. Lệnh ffmpeg mẫu nằm trong README của TRIP.
- Ảnh/video đổi được trong Dashboard (mục "Ảnh & video"), không phải sửa code.

## 4. Tiếng Việt không ngắt dòng giữa từ ghép
Trình duyệt ngắt "chuyên | nghiệp" rất xấu. Cách làm của TRIP (xem `src/lib/nowrap.js`): middleware
sau render, chỉ trang công khai, duyệt phần chữ hiển thị (bỏ thẻ, thuộc tính, script/style/
textarea/pre), nối ~220 từ ghép bằng `U+00A0`, xử lý từ chồng nhau bằng lookahead, số + đơn vị đi
liền; CSS `h1,h2,h3{text-wrap:balance} p,li{text-wrap:pretty}`; `<option>` phải có `value` cố định.
Khi làm ngành mới, bổ sung từ ghép của ngành vào danh sách.

## 5. Tiếp cận & hiệu năng (làm ngay từ đầu, kiểm lại ở web-qa)
- Mỗi trang một `h1`, link "Bỏ qua đến nội dung", nhãn `for` cho mọi ô nhập, lỗi gắn
  `aria-invalid`/`aria-describedby`, nút lọc `aria-pressed`, ảnh trang trí `alt=""`.
- Nút bấm ≥ 44px trên điện thoại; không tràn ngang 360–1920px; chữ ≥ 16px nội dung.
- Mỗi trang < 1.5MB trên điện thoại; CSS/JS có `?v=` cache 1 năm.

## 6. Kết quả: `docs/website/04-thiet-ke.md`
```
## Token (màu, font, bo góc, bóng)
## Trang chủ: từng section + ảnh/video cần có (ai cung cấp)
## Trang con: mẫu hero, section, khung tư vấn
## Component: thẻ, bảng giá, form, popup, thanh nổi
## Ảnh/video: danh sách cần xin chủ doanh nghiệp + ảnh tạm có nguồn
## Ảnh chụp bản xem trước (390 / 768 / 1300px)
## Cần xác nhận
```
Chốt với người dùng bằng ảnh chụp màn hình thật; nếu họ muốn đổi tông (TRIP: từ sáng sang navy),
chỉ đổi biến màu và chụp lại.
