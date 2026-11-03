# Giao việc cho Claude Cowork: đưa website TRIP lên tripdn.com

> **Cách dùng:** mở Claude Desktop → **Cowork** trên máy tính đã đăng nhập sẵn GitHub, Google (triptranslate.com@gmail.com), Render và trang quản lý tên miền tripdn.com. Dán toàn bộ nội dung từ dòng "--- BẮT ĐẦU ---" trở xuống.

--- BẮT ĐẦU ---

Bạn là trợ lý giúp tôi đưa website công ty TRIP lên Internet tại **https://tripdn.com**. Code đã viết xong và đã kiểm tra kỹ. Bạn chỉ thao tác cài đặt trên trình duyệt của tôi, theo đúng thứ tự dưới đây.

## Quy tắc khi làm

1. **Không bao giờ tự nhập, đọc to, chép vào chat hay lưu mã bí mật / mật khẩu.** Khi tới bước cần mã bí mật hay mật khẩu, hãy **dừng lại, nói rõ ô nào cần điền, rồi chờ tôi tự nhập**.
2. **Không tự bấm thanh toán.** Tới bước chọn gói trả phí, hãy dừng lại để tôi xác nhận.
3. Làm xong mỗi phần thì báo kết quả kèm bước kiểm tra ở cuối phần, rồi mới làm phần sau.
4. Gặp màn hình khác với mô tả, ví dụ giao diện đã đổi, thì chụp màn hình mô tả cho tôi và hỏi, không đoán.
5. Không xoá bất kỳ dịch vụ, bản ghi DNS hay dữ liệu nào ngoài những gì ghi rõ ở dưới.

## Thông tin cần biết

- Repository GitHub: `ntkimhoan267-lgtm/tripcompany`, code mới nhất ở nhánh **`claude/quirky-hypatia-cgzq96`**.
- Hosting: **Render**. File `render.yaml` trong repo đã cấu hình sẵn: gói Starter, vùng Singapore, ổ đĩa `trip-data` gắn vào `/var/data`, Node 22.22.0, health check `/healthz`.
- Email nhận thông báo khách mới: ntkimhoan267@gmail.com và triptranslate.com@gmail.com.
- Hướng dẫn chi tiết Google Sheet nằm trong repo: `docs/HUONG-DAN-GOOGLE-SHEET.md`.

---

## Phần 1: Gộp code vào nhánh chính trên GitHub

1. Mở https://github.com/ntkimhoan267-lgtm/tripcompany.
2. Tạo Pull Request từ nhánh `claude/quirky-hypatia-cgzq96` vào nhánh mặc định (`main`). Tiêu đề: "Website TRIP – bản chính thức".
3. **Dừng lại cho tôi xem** rồi tôi bấm **Merge**.

✅ Kiểm tra: nhánh `main` có file `render.yaml` và thư mục `views/`.

## Phần 2: Google Apps Script (Sheet + Gmail)

Làm trên tài khoản **triptranslate.com@gmail.com**.

1. **Mã bí mật:** nhắc tôi tự tạo một mã bí mật ngẫu nhiên ≥ 40 ký tự bằng trình quản lý mật khẩu, và lưu lại. Mã này dùng ở cả bước 4 và Phần 3. **Bạn không được tạo hay nhìn mã này.**
2. Mở https://script.google.com, tạo **Dự án mới**, đặt tên `TRIP Website`.
3. Xoá code mẫu. Mở file `google-apps-script/Code.gs` trong repo (nhánh `main`), chép **toàn bộ** nội dung vào, rồi bấm Lưu.
4. ⚙ **Cài đặt dự án** → **Thuộc tính tập lệnh** → **Thêm thuộc tính**. Tên: `TRIP_SECRET`. → **Dừng lại để tôi tự dán giá trị** → Lưu.
5. Chọn hàm `setup` → **Chạy**. Khi Google hỏi quyền: **Xem lại quyền** → chọn tài khoản → **Nâng cao** → **Đi tới TRIP Website** → **Cho phép**. (Script của chính mình nên có cảnh báo là bình thường.)
6. **Triển khai (Deploy) → Tùy chọn triển khai mới → Ứng dụng web (Web app)**:
   - Mô tả: `TRIP v1`
   - Thực thi dưới tên (Execute as): **Tôi (Me)**
   - Ai có quyền truy cập (Who has access): **Bất kỳ ai (Anyone)**
7. Bấm **Triển khai**, chép **URL ứng dụng web** (kết thúc bằng `/exec`). URL này không phải mã bí mật, có thể ghi lại cho Phần 3.

✅ Kiểm tra: trong Drive của triptranslate.com@gmail.com có Google Sheet **"TRIP Website - Khách hàng"** với 2 tab *Tư vấn* và *Đăng ký nhận tin*. Sheet đã được chia sẻ cho ntkimhoan267@gmail.com.

## Phần 3: Tạo website trên Render

1. Mở https://dashboard.render.com → **New → Blueprint** → kết nối GitHub (nếu chưa) → chọn repo `tripcompany`, nhánh `main`.
2. Render đọc `render.yaml` và tạo dịch vụ `trip-website`. Kiểm tra:
   - Gói (plan): **Starter**. **Không chọn Free**, vì gói Free không có ổ đĩa, mỗi lần cập nhật sẽ **mất toàn bộ dữ liệu khách**. → **Dừng lại để tôi xác nhận thanh toán.**
   - Ổ đĩa (Disk) `trip-data`, gắn tại `/var/data`, 1 GB.
3. Biến môi trường cần điền (các biến khác đã có sẵn):
   - `ADMIN_PASSWORD`: → **dừng lại để tôi tự nhập** (≥ 12 ký tự, mật khẩu đăng nhập Dashboard lần đầu)
   - `GOOGLE_SCRIPT_URL`: dán URL `/exec` ở Phần 2
   - `GOOGLE_SCRIPT_SECRET`: → **dừng lại để tôi tự dán** (giống hệt `TRIP_SECRET` ở Phần 2)
   - `SESSION_SECRET`: Render tự tạo, không cần đụng tới.
4. Bấm **Apply / Create**, chờ build xong (trạng thái **Live**).

✅ Kiểm tra:
- Mở `https://trip-website.onrender.com` (hoặc địa chỉ `.onrender.com` Render hiển thị): trang chủ hiện đúng.
- Mở `/healthz`: trang hiện chữ `ok`.

## Phần 4: Kiểm tra IP khách (1 lần, khoảng 3 phút)

Bước này giúp giới hạn chống spam đếm theo đúng từng khách, không gộp tất cả khách thành một.

1. Trên Render → `trip-website` → **Environment**: thêm biến `SHOW_CLIENT_IP` = `1` → Save (Render tự khởi động lại).
2. Mở `https://<địa-chỉ>.onrender.com/__ip`. Mở thêm https://api.ipify.org để xem IP thật của máy tôi.
3. So sánh với giá trị `"ip"` trong trang `/__ip`:
   - Nếu `"ip"` **trùng** IP thật thì đúng, không cần làm gì.
   - Nếu **không trùng** mà IP thật nằm trong danh sách `"ips"`: đếm vị trí của IP thật tính từ cuối danh sách (cuối cùng là 1), rồi thêm biến `TRUST_PROXY` bằng số đó. Lưu, mở lại `/__ip` để kiểm tra.
4. **Xoá biến `SHOW_CLIENT_IP`** → Save.

✅ Kiểm tra: `/__ip` giờ báo lỗi 404, và `"ip"` (lúc còn bật) đã trùng IP thật.

## Phần 5: Đăng nhập Dashboard và kiểm tra Google

1. Mở `https://<địa-chỉ>.onrender.com/admin`, tên đăng nhập `admin`. → **Dừng lại để tôi tự nhập mật khẩu.**
2. Vào **Tài khoản** → **dừng lại để tôi đổi mật khẩu mới**.
3. Trên Render, **xoá biến `ADMIN_PASSWORD`** → Save. (Mật khẩu đã lưu trong database, không cần biến này nữa.)
4. Dashboard → **Cài đặt** → bấm **Kiểm tra kết nối**. Phải báo "Kết nối Google thành công", kèm link Sheet.
5. Ra trang chủ, gửi thử form tư vấn (tên "Khách thử", SĐT `0905000000`, dịch vụ bất kỳ).

✅ Kiểm tra:
- Google Sheet có thêm dòng mới.
- Cả 2 Gmail đều nhận email "Khách mới cần tư vấn".
- Dashboard → **Khách tư vấn** có khách thử. Xoá khách thử ở cả Dashboard và Sheet.

## Phần 6: Gắn tên miền tripdn.com

1. Render → `trip-website` → **Settings → Custom Domains**: kiểm tra đã có `tripdn.com` và `www.tripdn.com` (do `render.yaml` thêm sẵn). Ghi lại **bản ghi DNS Render yêu cầu**: IP cho tên miền gốc, CNAME cho www.
2. Mở trang quản lý tên miền nơi tôi mua tripdn.com. **Hỏi tôi đó là nhà cung cấp nào nếu chưa rõ.** Vào phần **Quản lý DNS**:
   - Bản ghi **A**: tên `@`, giá trị là IP Render cung cấp (thường là `216.24.57.1`; luôn lấy theo Render).
   - Bản ghi **CNAME**: tên `www`, giá trị `trip-website.onrender.com` (theo Render).
   - Nếu đang có bản ghi A / AAAA / CNAME cũ cho `@` hoặc `www` trỏ về website demo cũ, hãy **liệt kê cho tôi xem trước khi xoá**.
3. Quay lại Render, bấm **Verify**. Chờ chứng chỉ HTTPS được cấp, thường mất 5 – 60 phút.

✅ Kiểm tra:
- `https://tripdn.com` mở được và có ổ khoá HTTPS.
- `http://tripdn.com` và `https://www.tripdn.com` đều tự chuyển về `https://tripdn.com`.

## Phần 7: Hoàn tất

1. Render → Environment: thêm `FORCE_CANONICAL_HOST` = `1` → Save. Từ giờ địa chỉ `.onrender.com` cũng tự chuyển về tripdn.com, để Google không thấy hai website trùng nhau.
2. Kiểm tra `https://tripdn.com/admin` đăng nhập được (cookie đăng nhập gắn theo tên miền nên phải đăng nhập lại).
3. Mở https://search.google.com/search-console → thêm tài sản **tripdn.com** (xác minh bằng bản ghi TXT DNS ở trang quản lý tên miền) → **Sơ đồ trang web** → gửi `https://tripdn.com/sitemap.xml`.
4. Dashboard → **Cài đặt** → **Tải bản sao lưu dữ liệu**, lưu file vào Google Drive. Nhắc tôi làm việc này **mỗi tuần**.

✅ Báo cáo cuối: liệt kê các phần đã xong, các bước tôi tự làm, và mọi điều bất thường gặp phải.

--- KẾT THÚC ---

## Ghi chú cho chủ website (không cần dán cho Cowork)

- Chi phí: Render Starter khoảng **$7/tháng** (cần để có ổ đĩa lưu dữ liệu). Google Apps Script và Gmail miễn phí.
- Mã bí mật `TRIP_SECRET` / `GOOGLE_SCRIPT_SECRET` phải **giống hệt nhau**. Nếu đổi, sửa ở cả hai nơi rồi **Deploy → Manage deployments → Edit → New version** trong Apps Script.
- Trong lịch sử code từng có một mã bí mật thử nghiệm cũ. Hãy chắc chắn Apps Script đang dùng **mã mới** bạn vừa tạo, không dùng lại mã cũ.
- Khi sửa `Code.gs` sau này, phải **triển khai phiên bản mới** thì thay đổi mới có hiệu lực.
