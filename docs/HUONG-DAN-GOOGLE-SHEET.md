# Hướng dẫn kết nối Google Sheet & Gmail (khoảng 5 phút)

Sau khi kết nối, mỗi khi khách điền form trên website:
1. Thông tin được ghi vào Google Sheet **"TRIP Website - Khách hàng"**. Sheet này tự tạo trong Drive ở lần chạy đầu tiên, gồm 2 tab: *Tư vấn* và *Đăng ký nhận tin*.
2. Sheet được chia sẻ quyền chỉnh sửa cho các Gmail cấu hình.
3. Email thông báo được gửi ngay tới:
   - **ntkimhoan267@gmail.com**
   - **triptranslate.com@gmail.com**

Dashboard cũng dùng kết nối này để **gửi bản tin tour hàng tháng**.

> Nên dùng Gmail **triptranslate.com@gmail.com** để làm các bước dưới. Sheet sẽ nằm trong Drive của tài khoản này, và email gửi đi sẽ mang tên TRIP.

---

## Bước 1: Tạo Apps Script

1. Mở https://script.google.com và đăng nhập Gmail của TRIP.
2. Bấm **Dự án mới (New project)**. Đổi tên dự án thành `TRIP Website`.
3. Xoá toàn bộ code mẫu. Dán toàn bộ nội dung file [`google-apps-script/Code.gs`](../google-apps-script/Code.gs) vào.
4. Ở dòng đầu file, đổi `DOI-MA-BI-MAT-NAY` thành một chuỗi bí mật bất kỳ, dài và khó đoán. Ví dụ `trip-2026-Xk9pQ7mZ`. **Ghi lại chuỗi này**, sẽ dùng ở Bước 3.
   ```js
   var SECRET = 'trip-2026-Xk9pQ7mZ';
   ```
5. Bấm 💾 **Lưu**.

## Bước 2: Cấp quyền và triển khai

1. Trên thanh công cụ, chọn hàm **`setup`** rồi bấm **▶ Chạy (Run)**.
2. Google sẽ hỏi cấp quyền. Bấm **Xem lại quyền**, chọn tài khoản, bấm **Nâng cao**, chọn **Đi tới TRIP Website (không an toàn)**, rồi bấm **Cho phép**.
   *Đây là script của chính bạn nên Google cảnh báo như vậy là bình thường.*
3. Mở **Nhật ký thực thi (Execution log)**. Bạn sẽ thấy link Google Sheet vừa được tạo.
4. Bấm **Triển khai (Deploy)**, chọn **Triển khai mới (New deployment)**.
   - Bấm ⚙ chọn loại **Ứng dụng web (Web app)**.
   - *Thực thi với tư cách (Execute as)*: **Tôi (Me)**.
   - *Ai có quyền truy cập (Who has access)*: **Bất kỳ ai (Anyone)**.
   - Bấm **Triển khai**. Sao chép **URL ứng dụng web**, có dạng `https://script.google.com/macros/s/AKfy.../exec`.

## Bước 3: Khai báo cho website

Trên hosting (Render, Railway hoặc VPS), thêm 2 biến môi trường:

| Biến | Giá trị |
|---|---|
| `GOOGLE_SCRIPT_URL` | URL ứng dụng web ở Bước 2 |
| `GOOGLE_SCRIPT_SECRET` | Chuỗi bí mật ở Bước 1 |

Sau đó khởi động lại website.

## Bước 4: Kiểm tra

1. Vào `https://tripdn.com/admin/settings` và bấm **Kiểm tra kết nối**. Nếu thành công, trang sẽ hiện link Google Sheet.
2. Ra trang chủ, điền thử form tư vấn. Kiểm tra:
   - Google Sheet có thêm dòng mới.
   - Hai Gmail đều nhận được email thông báo.

---

## Câu hỏi thường gặp

**Muốn thêm hoặc bớt Gmail nhận thông báo?**
Vào Dashboard, mở **Cài đặt**, sửa ô *Email nhận thông báo*. Không cần sửa script.

**Sửa code script thì có phải deploy lại không?**
Có. Vào **Triển khai**, chọn **Quản lý triển khai**, bấm ✏️ rồi chọn *Phiên bản: Phiên bản mới*, sau đó bấm **Triển khai**. URL giữ nguyên.

**Giới hạn gửi email?**
Gmail cá nhân gửi tối đa khoảng **100 người nhận/ngày** qua Apps Script. Google Workspace gửi được khoảng 1.500 người/ngày. Nếu danh sách nhận tin vượt mức này, hãy gửi bản tin chia nhiều ngày, hoặc chuyển sang dịch vụ email marketing (Mailchimp, Brevo…). Dữ liệu xuất CSV từ Dashboard để import.

**Google bị lỗi thì dữ liệu có mất không?**
Không. Mọi đăng ký luôn được lưu trong database của website trước. Bản ghi chưa đồng bộ được đánh dấu "chưa sync". Bấm **Đồng bộ** ở trang Tổng quan để gửi lại.
