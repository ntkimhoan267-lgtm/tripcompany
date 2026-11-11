# Giao việc cho Claude Cowork: đưa website <TÊN> lên <domain>

> **Cách dùng:** mở Claude Desktop → **Cowork** trên máy đã đăng nhập sẵn GitHub, Google (<email>), Render và trang quản lý tên miền. Dán toàn bộ nội dung từ "--- BẮT ĐẦU ---" trở xuống.

--- BẮT ĐẦU ---

Bạn là trợ lý giúp tôi đưa website <TÊN> lên Internet tại **https://<domain>**. Code đã viết xong và đã kiểm tra kỹ. Bạn chỉ thao tác cài đặt trên trình duyệt của tôi, theo đúng thứ tự dưới đây.

## Quy tắc khi làm
1. **Không bao giờ tự nhập, đọc to, chép vào chat hay lưu mã bí mật / mật khẩu.** Tới bước cần, **dừng lại, nói rõ ô nào cần điền, rồi chờ tôi tự nhập**.
2. **Không tự bấm thanh toán.** Tới bước chọn gói trả phí, dừng lại để tôi xác nhận.
3. Làm xong mỗi phần thì báo kết quả kèm bước kiểm tra ở cuối phần, rồi mới làm phần sau.
4. Gặp màn hình khác với mô tả, chụp màn hình mô tả cho tôi và hỏi, không đoán.
5. Không xoá bất kỳ dịch vụ, bản ghi DNS hay dữ liệu nào ngoài những gì ghi rõ ở dưới.

## Thông tin cần biết
- Repository: `<owner>/<repo>`, code mới nhất ở nhánh **`<nhánh>`** (commit `<hash>`).
- Hosting: Render, `render.yaml` đã cấu hình (gói, vùng, disk, Node, health check).
- Email nhận thông báo khách mới: <email1>, <email2>.
- Hướng dẫn Google Sheet: `docs/HUONG-DAN-GOOGLE-SHEET.md`.

## Phần 1: Gộp code vào nhánh chính
1. Mở GitHub → tạo Pull Request từ `<nhánh>` vào `main`, tiêu đề "<TÊN> – bản chính thức".
2. **Dừng lại cho tôi xem** rồi tôi bấm Merge.
✅ Kiểm tra: `main` có `render.yaml` và thư mục `views/`.

## Phần 2: Google Apps Script (Sheet + Gmail)
(các bước theo references/hosting.md; điểm dừng khi tạo Script property bí mật)
✅ Kiểm tra: URL `/exec` đã có; Dashboard → Cài đặt → "Kết nối Google thành công".

## Phần 3: Render
(Blueprint → biến môi trường: dừng khi nhập ADMIN_PASSWORD, GOOGLE_SCRIPT_SECRET → Deploy)
✅ Kiểm tra: `https://<app>.onrender.com/healthz` hiện `ok`.

## Phần 4: Tên miền
(lấy bản ghi từ Render → **dừng lại cho tôi xác nhận** trước khi thêm A/CNAME → chờ HTTPS → bật gia hạn tự động)
✅ Kiểm tra: `https://<domain>` mở trang chủ, ổ khoá HTTPS.

## Phần 5: TRUST_PROXY (IP khách thật)
✅ Kiểm tra: `/__ip` trùng IP thật; đã xoá `SHOW_CLIENT_IP`.

## Phần 6: Gửi form thử & Dashboard
1. Gửi form tư vấn: tên "Khách thử", SĐT 0905000000 → Google Sheet có dòng mới, email tới đủ địa chỉ.
2. Mở Dashboard → **dừng lại để tôi tự nhập mật khẩu** → xoá khách thử (cả trong Sheet).
3. Cài đặt → Tải bản sao lưu → lưu Google Drive thư mục riêng, không chia sẻ công khai. Nhắc tôi làm **mỗi tuần**.

## Phần 7: Google Search Console
(Thêm miền → TXT: **gửi cho tôi và dừng** → Xác minh → gửi `sitemap.xml` → yêu cầu lập chỉ mục trang chủ)

## Báo cáo cuối
Liệt kê: Render đang chạy commit nào, kết quả từng phần, ảnh chụp những chỗ cần tôi duyệt, và mọi điều bất thường.

--- KẾT THÚC ---

## Ghi chú cho chủ website (không cần dán cho Cowork)
- Nếu không đăng nhập được với báo "quá nhiều lần": có người thử mật khẩu; đợi 15 phút hoặc đổi mạng.
- Nội dung còn chờ xác nhận: <liệt kê>.
