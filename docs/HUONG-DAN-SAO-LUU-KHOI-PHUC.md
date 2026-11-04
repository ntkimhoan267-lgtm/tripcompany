# Sao lưu và khôi phục dữ liệu website TRIP

## Sao lưu (mỗi tuần)

1. Đăng nhập Dashboard bằng **tài khoản chủ** (tài khoản tạo đầu tiên; tài khoản nhân viên không thấy nút này).
2. **Cài đặt** → khối **Sao lưu dữ liệu** → **Tải bản sao lưu dữ liệu**.
3. Lưu file `trip-backup-YYYY-MM-DD.zip` vào Google Drive (thư mục riêng, không chia sẻ công khai).

File zip gồm:

| Trong file zip | Nội dung |
|---|---|
| `trip.db` | Database: khách tư vấn, người đăng ký, bài viết, tour, đánh giá, cài đặt, tài khoản (**không có mật khẩu**) |
| `uploads/` | Ảnh tải lên từ Dashboard (ảnh tour, ảnh bìa bài viết, ảnh trong bài) |
| `DOC-TRUOC-KHI-KHOI-PHUC.txt` | Ghi chú ngắn |

> Bản sao lưu chứa số điện thoại và email khách hàng. Giữ kín như giấy tờ của công ty.
> Mật khẩu đăng nhập đã được xoá khỏi bản sao lưu, nên sau khi khôi phục phải **đặt lại mật khẩu** (bước 5).

Render cũng tự chụp ổ đĩa mỗi ngày và giữ 7 ngày (Dashboard Render → dịch vụ `trip-website` → **Disks** → **Snapshots**). Bản zip ở trên là lớp dự phòng thứ hai, giữ lâu dài.

## Khôi phục trên Render

Làm khi: lỡ xoá nhầm dữ liệu, ổ đĩa hỏng, hoặc chuyển sang dịch vụ Render mới.

1. **Giải nén** file zip trên máy tính. Kiểm tra có `trip.db` và thư mục `uploads/`.
2. **Tạm dừng nhận khách:** Render → `trip-website` → **Settings** → **Suspend** *(không bắt buộc; nếu bỏ qua, khách gửi form trong lúc khôi phục có thể bị mất)*. Bật lại **Resume** trước bước 3 vì Shell cần dịch vụ đang chạy, rồi làm nhanh các bước dưới.
3. **Đưa file lên máy chủ.** Render không có nút tải file lên, nên dùng một trong hai cách:
   - **Cách A (khuyên dùng): khôi phục từ Snapshot** nếu sự cố xảy ra trong 7 ngày: **Disks → Snapshots → Restore** về thời điểm trước sự cố. Xong thì bỏ qua bước 4.
   - **Cách B: dùng file zip.** Tải file zip lên Google Drive, bấm **Chia sẻ → Bất kỳ ai có đường liên kết**, chép **ID file** (đoạn giữa `/d/` và `/view` trong link). Mở **Shell** của `trip-website` và chạy:
     ```bash
     cd /var/data && curl -L -o backup.zip "https://drive.google.com/uc?export=download&id=ID_FILE"
     ```
     Sau khi tải xong, **tắt chia sẻ** file trên Drive ngay.
4. **Giải nén vào ổ đĩa** (vẫn trong Shell). Script tự giữ lại dữ liệu hiện tại với đuôi `.truoc-khoi-phuc-<thời gian>` phòng khi cần quay lại:
   ```bash
   cd /opt/render/project/src && node scripts/restore-backup.js /var/data/backup.zip && rm /var/data/backup.zip
   ```
   Ngay sau đó **khởi động lại** dịch vụ (bước 6) để website dùng dữ liệu vừa khôi phục.
5. **Đặt lại mật khẩu** cho tài khoản chủ (thay `admin` bằng tên đăng nhập của bạn):
   ```bash
   cd /opt/render/project/src && NEW_PASSWORD='mat-khau-moi-it-nhat-12-ky-tu' node scripts/reset-password.js admin
   ```
   Tài khoản nhân viên cũng cần đặt lại mật khẩu (chạy lại lệnh với tên của từng người, hoặc tài khoản chủ xoá rồi tạo lại trong Dashboard).
6. **Khởi động lại:** Render → **Manual Deploy → Restart service** (hoặc Resume nếu đã Suspend).
7. **Kiểm tra:** mở `https://tripdn.com/healthz` (phải hiện `ok`), đăng nhập Dashboard bằng mật khẩu mới, xem mục Khách tư vấn và ảnh tour hiển thị đúng.
8. Khi mọi thứ ổn, xoá bản cũ trong Shell: `ls /var/data` để xem tên chính xác các file/thư mục có đuôi `.truoc-khoi-phuc-…`, rồi xoá từng cái bằng `rm -r /var/data/<tên>`.

## Khôi phục trên máy tính (để xem dữ liệu)

Giải nén file zip (chuột phải → Extract / Giải nén) vào một thư mục, ví dụ `trip-restore`.

Mở `trip.db` bằng [DB Browser for SQLite](https://sqlitebrowser.org) để xem bảng `leads` (khách tư vấn), `subscribers` (người đăng ký), v.v. Hoặc chạy website trên máy: trong thư mục mã nguồn, chạy `DATA_DIR=<thư mục trip-restore> NEW_PASSWORD='...' node scripts/reset-password.js admin`, rồi `DATA_DIR=<thư mục trip-restore> npm start`.
