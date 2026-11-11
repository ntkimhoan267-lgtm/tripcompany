---
name: web-qa
description: >-
  Bước 7 của quy trình xây website – kiểm tra website nhiều vòng trước khi lên mạng theo đúng cách
  đã làm ở TRIP: (1) giao diện trên ảnh chụp thật 360–1920px, (2) backend & bảo mật, (3) nội dung &
  dữ liệu (giá nhất quán, không bịa), (4) tiếp cận & hiệu năng, (5) trình duyệt thật bằng Playwright
  (menu, popup, focus, form), rồi tiêu chí nghiệm thu và nhật ký lỗi. Dùng khi người dùng nói "kiểm
  tra website", "rà lỗi", "review trước khi deploy", "test giao diện mobile", "có lỗi gì không",
  "nghiệm thu", hoặc sau mỗi đợt code lớn. Mỗi lỗi tìm ra phải có test tái hiện và commit sửa.
---

# Kiểm tra nhiều vòng (QA)

Ở TRIP, vòng code đầu "chạy được" nhưng 5 vòng kiểm tra sau đó tìm ra hơn 40 lỗi: tràn ngang trên
điện thoại, focus lọt khỏi menu, mô tả Google lệch giá, `.gitignore` chặn nhầm thư mục dữ liệu,
bản tin gửi trùng, cookie phiên không vô hiệu khi đổi mật khẩu... Vì vậy QA là bước bắt buộc và
làm **theo vòng, mỗi vòng một góc nhìn**, ghi nhật ký vào `docs/website/07-kiem-tra.md`.

## Cách chạy một vòng
1. Khởi động web với DB tạm (`DATA_DIR` tạm, mật khẩu test), chụp màn hình bằng Playwright ở
   390 / 768 / 1300 px cho **mọi** trang trong sitemap và các trang Dashboard chính.
2. Rà theo checklist của vòng trong `references/checklists.md`. Ghi mỗi lỗi: trang, mô tả, mức
   (chặn / nặng / nhẹ), ảnh chụp.
3. Sửa theo thứ tự mức; **viết test tái hiện lỗi trước khi sửa** khi lỗi thuộc backend/bảo mật/
   dữ liệu. Chạy `npm test` và `npm run test:browser`.
4. Commit "Sửa lỗi từ đợt kiểm tra <tên vòng>" kèm danh sách mục đã sửa; cập nhật nhật ký.
5. Vòng sau chỉ bắt đầu khi vòng trước còn 0 lỗi chặn.

## 5 vòng (thứ tự khuyến nghị)
| Vòng | Góc nhìn | Công cụ |
|---|---|---|
| 1. Giao diện | Nhìn như khách: tràn ngang, chữ nhỏ, ảnh méo, nút che nhau, tông màu, khoảng trắng, từ ghép bị ngắt dòng | Ảnh chụp Playwright, so với `04-thiet-ke.md` |
| 2. Backend & bảo mật | Form spam, CSRF, rate limit, phiên, upload giả, lộ dữ liệu, secret trong code, TRUST_PROXY, lỗi Google không mất lead | Test tự động, đọc code, thử tay bằng curl |
| 3. Nội dung & dữ liệu | Giá nhất quán giữa mọi trang và mô tả Google; không giá nội bộ; không số liệu/feedback chưa xác nhận; chính tả; link hỏng; thông tin pháp lý có ngày | Grep toàn bộ views/data, mở từng trang |
| 4. Tiếp cận & hiệu năng | h1 duy nhất, nhãn ô nhập, focus, tương phản, alt; dung lượng trang mobile < 1.5MB, video không tải trên điện thoại, cache | Lighthouse/PageSpeed, axe, xem Network |
| 5. Trình duyệt thật | Menu điện thoại (focus trap, Esc, inert), popup trả focus, form gửi thật tới Apps Script giả, Dashboard không tràn ngang, tắt JS vẫn gửi form | Playwright test (`test/browser`) |

Sau 5 vòng, chạy **vòng tổng hợp 10 mục** (TRIP đã làm): chọn 10 kịch bản khách thật từ đầu đến
cuối (ví dụ: khách từ Facebook vào trang visa trên điện thoại → xem giá → bấm ưu đãi → để lại SĐT
→ Dashboard thấy → Sheet có dòng → email tới), mỗi kịch bản 1 test.

## Tiêu chí nghiệm thu (dán vào `07-kiem-tra.md`, tick từng mục)
- [ ] Mọi mục menu mở trang riêng; trang chủ chỉ phần nổi bật.
- [ ] Giá chỉ là giá công khai, một nguồn dữ liệu, nhất quán mọi trang và mô tả Google.
- [ ] Không số liệu / đánh giá / logo / cam kết chưa được chủ doanh nghiệp xác nhận.
- [ ] Gửi form → DB → Google Sheet → email đủ người nhận; Dashboard thấy lead; lỗi Google không mất lead.
- [ ] Popup đúng điều kiện; bản tin gửi theo đợt, không trùng, huỷ đăng ký được.
- [ ] Không tràn ngang 360–1920px; menu điện thoại mở/đóng/focus đúng; tab và link `#` đúng.
- [ ] Điện thoại không tải video; mỗi trang < 1.5MB; PageSpeed mobile ≥ 80.
- [ ] Không từ ghép tiếng Việt bị ngắt dòng ở tiêu đề và nội dung chính.
- [ ] Console không lỗi; `npm test` và `npm run test:browser` đạt 100%.
- [ ] Không secret trong mã nguồn; production từ chối chạy khi SESSION_SECRET yếu.
- [ ] `.gitignore` không chặn thư mục cần deploy; `npm ci --omit=dev && npm start` chạy được từ clone sạch.
- [ ] README và docs cập nhật đúng phiên bản.

## Nhật ký: `docs/website/07-kiem-tra.md`
```
## Vòng <n>: <tên> – ngày – commit
| # | Trang | Lỗi | Mức | Cách sửa | Test |
## Còn lại / chấp nhận (lý do)
```
