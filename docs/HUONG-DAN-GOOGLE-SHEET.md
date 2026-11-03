# Hướng dẫn kết nối Google Sheet & Gmail (khoảng 5 phút)

Sau khi kết nối, mỗi khi khách điền form trên website:
1. Thông tin được ghi vào Google Sheet **"TRIP Website - Khách hàng"**. Sheet này tự tạo trong Drive ở lần chạy đầu tiên, gồm 2 tab: *Tư vấn* và *Đăng ký nhận tin*.
2. Sheet được chia sẻ quyền chỉnh sửa cho các Gmail cấu hình.
3. Email thông báo được gửi ngay tới:
   - **ntkimhoan267@gmail.com**
   - **triptranslate.com@gmail.com**

Dashboard cũng dùng kết nối này để **gửi bản tin tour hàng tháng**.

> Có thể cài bằng **triptranslate.com@gmail.com** hoặc **ntkimhoan267@gmail.com**. Google Sheet sẽ nằm trong Drive của tài khoản dùng để cài (và tự chia sẻ cho Gmail còn lại). Dù cài bằng tài khoản nào, bản tin gửi khách luôn hiện tên **TRIP Đà Nẵng** và khách bấm "Trả lời" sẽ về **triptranslate.com@gmail.com** (cấu hình `SENDER_NAME`, `REPLY_TO` đầu file `Code.gs`). Địa chỉ người gửi thực tế vẫn là Gmail dùng để cài.

---

## Bước 1: Tạo mã bí mật

Mã bí mật dùng để website và Apps Script nhận ra nhau. **Không dùng lại mã có sẵn ở bất kỳ đâu.** Hãy tạo một mã mới, ngẫu nhiên, dài ít nhất 32 ký tự. Có hai cách:

- Trên máy có Node.js, chạy lệnh:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- Hoặc dùng trình quản lý mật khẩu (Bitwarden, 1Password…) để tạo chuỗi ngẫu nhiên 40 ký tự.

Lưu mã này vào trình quản lý mật khẩu. **Không gửi qua chat, không dán vào code.**

## Bước 2: Tạo Apps Script

1. Mở https://script.google.com và đăng nhập Gmail của TRIP.
2. Bấm **Dự án mới (New project)**. Đổi tên thành `TRIP Website`.
3. Xoá code mẫu. Dán toàn bộ nội dung file [`google-apps-script/Code.gs`](../google-apps-script/Code.gs) vào, rồi bấm 💾 **Lưu**.
4. Mở ⚙ **Cài đặt dự án (Project Settings)** và kéo xuống mục **Thuộc tính tập lệnh (Script properties)**. Bấm **Thêm thuộc tính**:
   - Thuộc tính: `TRIP_SECRET`
   - Giá trị: mã bí mật ở Bước 1

   Bấm **Lưu**.
5. Quay lại trình soạn thảo. Chọn hàm **`setup`** rồi bấm **▶ Chạy (Run)**. Google sẽ hỏi cấp quyền: bấm **Xem lại quyền**, chọn tài khoản, bấm **Nâng cao**, chọn **Đi tới TRIP Website**, rồi bấm **Cho phép**.
   *Đây là script của chính bạn nên Google cảnh báo như vậy là bình thường.*
6. Mở **Nhật ký thực thi (Execution log)** để thấy link Google Sheet vừa được tạo. Sheet được chia sẻ sẵn cho 2 Gmail trong `NOTIFY_EMAILS`.
7. Bấm **Triển khai (Deploy)**, chọn **Triển khai mới (New deployment)**, rồi bấm ⚙ chọn loại **Ứng dụng web (Web app)**:
   - *Thực thi với tư cách*: **Tôi (Me)**
   - *Ai có quyền truy cập*: **Bất kỳ ai (Anyone)**

   Bấm **Triển khai** và sao chép **URL ứng dụng web**, dạng `https://script.google.com/macros/s/.../exec`.

> Vì sao chọn "Bất kỳ ai"? Website gọi script từ máy chủ, không đăng nhập Google. Script chỉ chấp nhận request được **ký bằng mã bí mật** (HMAC) và còn hạn trong 10 phút. Không có mã thì không gọi được.

## Bước 3: Khai báo cho website

Trên hosting (Render, Railway hoặc VPS), thêm 2 biến môi trường:

| Biến | Giá trị |
|---|---|
| `GOOGLE_SCRIPT_URL` | URL ứng dụng web ở Bước 2 |
| `GOOGLE_SCRIPT_SECRET` | Mã bí mật ở Bước 1 (trùng với `TRIP_SECRET`) |

Sau đó khởi động lại website.

## Bước 4: Kiểm tra

1. Vào `https://tripdn.com/admin/settings` và bấm **Kiểm tra kết nối**. Nếu thành công, trang sẽ hiện link Google Sheet.
2. Ra trang chủ, điền thử form tư vấn. Kiểm tra:
   - Google Sheet có thêm dòng mới.
   - Hai Gmail đều nhận được email thông báo.

---

## Câu hỏi thường gặp

**Muốn thêm hoặc bớt Gmail nhận thông báo?**
Vì lý do bảo mật, danh sách này chỉ đổi được trong script: sửa biến `NOTIFY_EMAILS` ở đầu file Code.gs, rồi triển khai lại (xem câu dưới). Khi bớt một Gmail, vào Google Sheet → **Chia sẻ** để gỡ quyền của Gmail đó.

**Lộ mã bí mật thì làm gì?**
Tạo mã mới (Bước 1), cập nhật đồng thời `TRIP_SECRET` trong Script properties và `GOOGLE_SCRIPT_SECRET` trên hosting.

**Sửa code script thì có phải deploy lại không?**
Có. Vào **Triển khai**, chọn **Quản lý triển khai**, bấm ✏️ rồi chọn *Phiên bản: Phiên bản mới*, sau đó bấm **Triển khai**. URL giữ nguyên.

**Giới hạn gửi email?**
Gmail cá nhân gửi tối đa khoảng **100 email/ngày** qua Apps Script, tính cả email thông báo khách mới. Google Workspace gửi được khoảng 1.500 email/ngày. Mỗi lần bấm gửi, bản tin chỉ đi tối đa 60 người và luôn chừa lại khoảng 30 email cho thông báo khách mới. Để chống spam form làm cạn hạn mức, mỗi ngày chỉ gửi tối đa 25 email báo khách tư vấn và 10 email báo người đăng ký mới; quá mức đó khách vẫn được ghi đầy đủ vào Sheet và Dashboard, chỉ không gửi email. Danh sách lớn hơn thì vào hôm sau bấm **Gửi tiếp** ở mục Lịch sử gửi. Khi danh sách vượt vài trăm người, nên chuyển sang dịch vụ email marketing (Mailchimp, Brevo…), dùng dữ liệu xuất CSV từ Dashboard để import.

**Google bị lỗi thì dữ liệu có mất không?**
Không. Mọi đăng ký luôn được lưu trong database của website trước. Bản ghi chưa đồng bộ được đánh dấu "chưa sync". Bấm **Đồng bộ** ở trang Tổng quan để gửi lại.

## Thêm người nhận thông báo sau này

Script chỉ tự chia sẻ Google Sheet cho các email trong `NOTIFY_EMAILS` **lúc tạo Sheet lần đầu**. Nếu thêm email mới vào `NOTIFY_EMAILS` sau đó: sửa danh sách trong script, **Deploy → Manage deployments → Edit → New version**, rồi tự bấm **Chia sẻ** Google Sheet cho email mới.
