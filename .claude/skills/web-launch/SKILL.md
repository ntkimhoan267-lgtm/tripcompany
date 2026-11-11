---
name: web-launch
description: >-
  Bước 8 của quy trình xây website – đưa website lên mạng và bàn giao: Render (Blueprint từ
  render.yaml, ổ đĩa, biến môi trường, health check) hoặc VPS, gắn tên miền (DNS A/CNAME, HTTPS, gia
  hạn tự động), Google Apps Script (Sheet + Gmail), TRUST_PROXY, Google Search Console, sao lưu định
  kỳ, và viết tài liệu giao việc cho Claude Cowork để thao tác trên trình duyệt (quy tắc không nhập
  mật khẩu, không tự thanh toán, không đổi DNS khi chưa hỏi). Dùng khi người dùng nói "deploy", "đưa
  web lên mạng", "trỏ tên miền", "Render", "Google Sheet nhận form", "bàn giao", "hướng dẫn cho
  Cowork", "cập nhật bản mới lên web thật".
---

# Triển khai & bàn giao

Người dùng thường thao tác trên trình duyệt (GitHub, Render, DNS, Google) qua Claude Cowork trên máy
của họ. Vì vậy sản phẩm chính của bước này là **tài liệu giao việc** rõ từng bước, có điểm dừng
chờ người dùng và bước kiểm tra sau mỗi phần. Mẫu đã dùng thật ở TRIP nằm trong
`references/cowork-template.md`; hướng dẫn kỹ thuật hosting/DNS ở `references/hosting.md`.

## Trình tự
1. **Chốt mã nguồn**: `npm test` + `test:browser` đạt; README đúng; `render.yaml` (gói, vùng
   Singapore, disk gắn `DATA_DIR`, Node version, health check `/healthz`); `.env.example` đủ biến.
   Ghi rõ **nhánh và commit** cần deploy.
2. **Viết `docs/HUONG-DAN-COWORK-TRIEN-KHAI.md`** theo mẫu: quy tắc → thông tin cần biết → các
   phần theo thứ tự (gộp code vào main → Apps Script → Render → tên miền → TRUST_PROXY → kiểm tra
   form thật → Search Console → sao lưu) → báo cáo cuối.
3. **Kiểm tra sau khi lên**: `/healthz` = ok; gửi form thử (tên "Khách thử", SĐT 0905000000) →
   Sheet + email → xoá khách thử; đăng nhập Dashboard (người dùng tự nhập mật khẩu); tải bản sao lưu.
4. **Bàn giao**: `docs/website/08-trien-khai.md` ghi hosting, nhánh deploy, biến môi trường (tên,
   không giá trị), lịch sao lưu hằng tuần, cách đổi giá/ảnh/bài viết trong Dashboard, số liên hệ hỗ trợ.
   Nhắc bật **gia hạn tự động** tên miền và hosting.
5. **Mỗi đợt cập nhật sau này**: viết `docs/COWORK-CAP-NHAT-<tên>.md`: những gì đã thay đổi (để
   Cowork nắm bối cảnh) → việc cần làm (kiểm tra Render chạy commit mới, cập nhật Apps Script nếu
   `Code.gs` đổi, kiểm tra nhanh từng tính năng trên web thật) → báo cáo cuối → ghi chú cho chủ
   website (không cần dán cho Cowork).

## Quy tắc trong mọi tài liệu giao việc Cowork
1. Không bao giờ tự nhập, đọc, chép hay lưu mật khẩu/mã bí mật; tới bước đó thì dừng và chờ người dùng.
2. Không tự bấm thanh toán; không tự thay đổi DNS khi chưa hỏi.
3. Làm xong mỗi phần thì báo kết quả kèm bước kiểm tra, rồi mới làm phần sau.
4. Màn hình khác mô tả → chụp màn hình và hỏi, không đoán.
5. Không xoá dịch vụ, bản ghi DNS hay dữ liệu nào ngoài những gì ghi rõ.

## Bảo mật khi bàn giao
- Mật khẩu Dashboard đặt bởi chủ, ≥ 12 ký tự; tạo tài khoản nhân viên riêng, không dùng chung.
- `SESSION_SECRET`, `GOOGLE_SCRIPT_SECRET` sinh ngẫu nhiên ≥ 32 ký tự, chỉ nằm trong Render env.
- Sao lưu `.zip` lưu Google Drive thư mục riêng không chia sẻ công khai; nhắc hằng tuần.
- Xoá endpoint kiểm tra tạm (`/__ip`, `SHOW_CLIENT_IP`) sau khi xong.
