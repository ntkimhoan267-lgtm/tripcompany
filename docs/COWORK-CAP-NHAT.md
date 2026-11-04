# Cập nhật cho Cowork: các bước tiếp theo sau đợt sửa lỗi

> **Cách dùng:** dán toàn bộ phần từ "--- BẮT ĐẦU ---" trở xuống vào cuộc trò chuyện Cowork đang triển khai website TRIP.

--- BẮT ĐẦU ---

Website TRIP vừa có thêm một đợt sửa lỗi và cải tiến. Code mới nhất nằm ở nhánh **`claude/quirky-hypatia-cgzq96`** (commit `bdb8c0e`) của repo `ntkimhoan267-lgtm/tripcompany`. Tất cả 52 test tự động đều đạt.

Quy tắc giữ nguyên như trước: **không tự nhập hay đọc mật khẩu / mã bí mật** (dừng lại để tôi tự nhập), **không tự bấm thanh toán**, không xoá gì ngoài những gì ghi rõ dưới đây. Làm xong từng bước thì báo kết quả rồi mới làm bước sau.

## Những gì đã thay đổi (để bạn nắm bối cảnh)

1. **Bản tin tháng:** chống gửi trùng (khoá nút, mỗi lúc chỉ một đợt gửi); mỗi đợt tối đa 60 người; nếu mất kết nối với Google giữa chừng, những người đó được đánh dấu **"chưa rõ"** và không tự gửi lại; có nút **"Cho phép gửi lại"** trong trang Bản tin.
2. **Sao lưu:** Dashboard → Cài đặt → khối **Sao lưu dữ liệu** (chỉ tài khoản chủ thấy) → tải file `.zip` gồm database + ảnh; **không chứa mật khẩu**. Có nút **"Dọn ảnh không còn dùng"**. Hướng dẫn khôi phục: `docs/HUONG-DAN-SAO-LUU-KHOI-PHUC.md`.
3. **Form khi trình duyệt tắt JavaScript** vẫn gửi được và hiện trang cảm ơn.
4. **Đăng nhập Dashboard:** mật khẩu được mã hoá mạnh hơn (tự nâng cấp ở lần đăng nhập đúng kế tiếp); giới hạn đăng nhập sai: 10 lần / 15 phút cho mỗi máy, 100 lần / giờ cho mỗi tài khoản.
5. **Apps Script (`google-apps-script/Code.gs`) ĐÃ THAY ĐỔI:** chừa đủ hạn mức Gmail cho email báo khách mới (tính theo số người nhận); báo lại email sai định dạng.
6. **`/healthz`** kiểm tra cả việc ghi được ổ đĩa. Khi deploy, website chờ các thao tác đang chạy xong rồi mới tắt.
7. **Giao diện:** thumbnail mới cho video giới thiệu ở trang chủ; ảnh WebP nhiều kích cỡ (trang nhẹ hơn); cờ quốc gia lưu ngay trên website; sửa focus bàn phím trong menu điện thoại và popup.
8. **Hướng dẫn TRUST_PROXY đã sửa:** đếm vị trí IP thật trong chuỗi **`"xff"`** (tính từ cuối, cuối cùng là 1), **không** đếm trong `"ips"`.

**Không có biến môi trường bắt buộc mới.**

## Việc cần làm

### Bước 1: Đảm bảo Render chạy bản mới nhất
1. Mở Render → dịch vụ `trip-website` → **Settings → Build & Deploy**: xem dịch vụ đang deploy từ **nhánh nào**.
   - Nếu là `claude/quirky-hypatia-cgzq96`: Render tự deploy khi có commit mới. Sang bước 2.
   - Nếu là `main`: tạo Pull Request từ `claude/quirky-hypatia-cgzq96` vào `main` trên GitHub, **dừng lại cho tôi xem rồi tôi bấm Merge**.
2. Vào **Events**: deploy mới nhất phải ứng với commit **`bdb8c0e`** và trạng thái **Live**. Nếu chưa tự chạy, bấm **Manual Deploy → Deploy latest commit**.
3. Mở `https://<địa-chỉ-website>/healthz` (tripdn.com nếu đã gắn tên miền, hoặc địa chỉ `.onrender.com`): phải hiện **`ok`**.

### Bước 2: Cập nhật Apps Script (bắt buộc vì `Code.gs` đã đổi)
1. Mở file `google-apps-script/Code.gs` trên GitHub (nhánh ở Bước 1), bấm **Raw**, chép **toàn bộ** nội dung.
2. Mở https://script.google.com (tài khoản **ntkimhoan267@gmail.com**) → dự án **TRIP Website** → file `Code.gs` → xoá hết nội dung cũ, dán nội dung mới → **Lưu**.
   - **Không** đụng tới mục Script properties (giữ nguyên `TRIP_SECRET`, `SHEET_ID`).
3. **Deploy → Manage deployments** → chọn bản đang dùng → biểu tượng ✏️ **Edit** → **Version: New version** → **Deploy**.
   - **Không** tạo "New deployment" (sẽ ra URL mới, phải sửa lại trên Render). URL `/exec` phải giữ nguyên.
4. Dashboard website → **Cài đặt** → **Kiểm tra kết nối** → phải báo "Kết nối Google thành công".

### Bước 3: Kiểm tra nhanh trên website
1. **Trang chủ** (máy tính và điện thoại): khung cửa sổ máy bay hiện ảnh tư vấn viên áo TRIP trên nền trời cam, nút play ở vùng cổ áo; bấm vào mở được video.
2. **Gửi thử form tư vấn** (tên "Khách thử", SĐT `0905000000`) → kiểm tra có dòng mới trong Google Sheet và cả 2 Gmail nhận email "Khách mới cần tư vấn". Xoá khách thử ở Dashboard và Sheet.
3. **Đăng nhập Dashboard** → **dừng lại để tôi tự nhập mật khẩu**.
4. **Cài đặt → Tải bản sao lưu dữ liệu** → kiểm tra tải về được file `trip-backup-<ngày>.zip` → lưu vào Google Drive (thư mục riêng, **không chia sẻ công khai**). Nhắc tôi làm việc này **mỗi tuần**.
5. Nếu **Phần 4 (kiểm tra IP khách / TRUST_PROXY)** của hướng dẫn triển khai trước **chưa làm**: làm theo `docs/HUONG-DAN-COWORK-TRIEN-KHAI.md` (bản mới đã sửa cách đếm — đếm trong `"xff"`). Nếu **đã làm** theo cách cũ (đếm trong `"ips"`): bật lại `SHOW_CLIENT_IP=1`, mở `/__ip`, kiểm tra `"ip"` có trùng IP thật của tôi (xem ở https://api.ipify.org) không; không trùng thì sửa `TRUST_PROXY` theo cách mới; xong **xoá `SHOW_CLIENT_IP`**.

### Báo cáo cuối
Liệt kê: Render đang chạy commit nào, Apps Script đã lên phiên bản mới chưa, kết quả từng mục ở Bước 3, và mọi điều bất thường.

--- KẾT THÚC ---

## Ghi chú cho chủ website (không cần dán cho Cowork)

- Nếu một ngày không đăng nhập được Dashboard với thông báo "quá nhiều lần": có người đang thử mật khẩu; đợi 15 phút hoặc đăng nhập từ mạng khác (4G).
- Còn vài nội dung cần bạn xác nhận (giá 4 tour mẫu, "Miễn phí kiểm tra hồ sơ", "Hỗ trợ đổi – hoàn vé", "xe đời mới", "6+ ngôn ngữ", ảnh VinWonders, dòng visa Mỹ "gia hạn miễn phỏng vấn").
