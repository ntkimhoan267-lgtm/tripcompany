# Cập nhật cho Cowork: bảng giá, ưu đãi, ảnh/video và bài viết chuẩn SEO

> **Cách dùng:** dán toàn bộ phần từ "--- BẮT ĐẦU ---" đến "--- KẾT THÚC ---" vào cuộc trò chuyện Cowork đang triển khai website TRIP.

--- BẮT ĐẦU ---

Website TRIP vừa có thêm một đợt tính năng mới. Code nằm ở nhánh **`claude/admiring-newton-6w3eeq`** của repo `ntkimhoan267-lgtm/tripcompany` (lấy **commit mới nhất** của nhánh). Toàn bộ test tự động đều đạt.

Quy tắc giữ nguyên như trước: **không tự nhập hay đọc mật khẩu / mã bí mật** (dừng lại để tôi tự nhập), **không tự bấm thanh toán**, **không tự thay đổi DNS** khi chưa hỏi tôi, không xoá gì ngoài những gì ghi rõ dưới đây. Làm xong từng bước thì báo kết quả rồi mới làm bước sau.

## Những gì đã thay đổi (để bạn nắm bối cảnh)

1. **Dashboard → Bảng giá & ưu đãi** (chỉ tài khoản chủ): sửa giá mọi dịch vụ ngay trên Dashboard (visa Trung Quốc, visa các nước, giá "trọn gói từ" của 4 thị trường, E-visa, dịch thuật, phụ phí, hợp pháp hoá, hộ chiếu, hộ chiếu làm nhanh, xe đưa đón, xe tự lái), thêm/xoá/sắp xếp dòng, đổi ảnh từng tuyến xe, khôi phục giá mặc định. Không cần sửa code để đổi giá nữa.
2. **Ưu đãi "giảm 500.000đ khi để lại SĐT hoặc Gmail"**: giá **niêm yết** trên website = giá thật + 500.000đ (visa tính bằng USD: + 20 USD), kèm nút 🎁. Khách để lại số điện thoại hoặc Gmail (popup 🎁, form tư vấn, form nhận tin) thì giá niêm yết bị gạch và hiện giá thật. Mặc định áp dụng cho: visa Trung Quốc, visa các nước, giá "từ" 4 thị trường, hộ chiếu, hợp pháp hoá, tour. Dịch thuật, phụ phí, xe đưa đón, E-visa đang **tắt** (bật được trong Dashboard). Khách để lại SĐT vào mục Khách tư vấn với ghi chú **[Ưu đãi]** (cùng số trong 24 giờ không tạo trùng); khách để lại Gmail vào mục Đăng ký nhận tin với trạng thái **"Chỉ nhận ưu đãi"** (không nhận bản tin), trừ khi khách tick ô "Nhận bản tin".
3. **Dashboard → Ảnh & video** (chỉ tài khoản chủ): đổi ảnh và video nền của trang chủ, 4 thị trường visa, các trang visa, từng dịch vụ (dịch thuật, hợp pháp hoá, hộ chiếu, vé máy bay, tour, xe, bảo hiểm), trang Bảng giá, Tour, Cẩm nang. Tải ảnh (tự nén WebP) hoặc video MP4 tối đa 40MB.
4. **Hộ chiếu làm nhanh 1–7 ngày**: bảng 7 gói "Cần trong 1 ngày" … "Cần trong 7 ngày" (số ngày khách cần có hộ chiếu, tính tới ngày bay) trên trang `/dich-vu/ho-chieu` (mục "Làm hộ chiếu nhanh") và trang Bảng giá, giá đều là **"Liên hệ tư vấn"** (nhập giá trong Dashboard nếu muốn hiện giá), kèm ghi chú TRIP không cam kết thời gian thay cơ quan nhà nước. Bấm "Tư vấn ngay" mở form với ghi chú điền sẵn số ngày khách cần.
5. **Bài viết chuẩn SEO** (Dashboard → Bài viết):
   - Mục lục **"Nội dung chính"** tự tạo từ các tiêu đề `##` / `###`, đánh số, thu gọn được.
   - Ô mới: tiêu đề Google, mô tả Google, từ khoá chính, mô tả ảnh bìa (alt), tác giả, câu hỏi thường gặp (FAQ), ẩn khỏi Google (noindex), **hẹn giờ đăng**.
   - **4 giao diện bài viết** chọn cho từng bài: Cổ điển, Hướng dẫn (mục lục dính bên trái), Tạp chí (ảnh bìa lớn), Tối giản; và 3 màu nhấn.
   - Khung **"Kiểm tra SEO"** chấm điểm /100 và xem trước kết quả Google ngay khi gõ.
   - Website tự thêm dữ liệu có cấu trúc cho Google (BlogPosting, FAQPage, Breadcrumb), ngày cập nhật trong `sitemap.xml`, và **tự chuyển hướng 301** khi đổi đường dẫn bài đã đăng.
6. **Bài viết mới đã đăng sẵn**: "Làm hộ chiếu nhanh khi sắp bay: hộ chiếu sắp hết hạn hoặc còn dưới 6 tháng phải làm sao?" tại `/blog/lam-ho-chieu-nhanh-khi-sap-bay` (tự thêm 1 lần khi website khởi động bản mới).
7. Database **tự nâng cấp** khi khởi động (thêm cột cho bài viết, bảng chuyển hướng). **Không có biến môi trường mới. Apps Script (`Code.gs`) không đổi**, không cần cập nhật Google.

## Việc cần làm

### Bước 1: Đảm bảo Render chạy bản mới nhất
1. Mở Render → dịch vụ `trip-website` → **Settings → Build & Deploy**: xem dịch vụ đang deploy từ **nhánh nào**.
   - Nếu là `claude/admiring-newton-6w3eeq`: Render tự deploy khi có commit mới. Sang mục 2.
   - Nếu là nhánh khác (`main` hoặc `claude/quirky-hypatia-cgzq96`): tạo Pull Request từ `claude/admiring-newton-6w3eeq` vào nhánh Render đang dùng trên GitHub, **dừng lại cho tôi xem rồi tôi bấm Merge**.
2. Vào **Events**: deploy mới nhất phải ứng với **commit mới nhất của nhánh** và trạng thái **Live**. Nếu chưa tự chạy, bấm **Manual Deploy → Deploy latest commit**.
3. Mở `https://<địa-chỉ-website>/healthz`: phải hiện **`ok`**.

### Bước 2: Kiểm tra nhanh trên website (máy tính và điện thoại)
1. **Bảng giá** (`/bang-gia`): visa Du lịch (L) 15 ngày hiện **3.300.000đ** kèm nút **🎁 −500k**; có dải thông báo "Giảm 500.000đ… khi để lại số điện thoại hoặc Gmail".
2. Bấm **🎁 −500k** → popup "Nhận giá ưu đãi ngay" → nhập SĐT thử `0905000000` → bấm "Xem giá ưu đãi": giá 3.300.000đ bị gạch, hiện **2.800.000đ**. Tải lại trang: vẫn hiện giá ưu đãi.
3. Mở **Dashboard** → **dừng lại để tôi tự nhập mật khẩu**. Vào **Khách tư vấn**: có khách "Khách nhận ưu đãi" SĐT `0905000000` với ghi chú [Ưu đãi] → **xoá khách thử này** (và dòng tương ứng trong Google Sheet nếu có).
4. **Hộ chiếu** (`/dich-vu/ho-chieu`): ảnh đầu trang là ảnh hộ chiếu Việt Nam thật; có mục "Làm hộ chiếu nhanh 1 – 7 ngày" với 7 thẻ "Liên hệ tư vấn"; bấm "Tư vấn ngay" ở thẻ "Cần trong 2 ngày" → form mở sẵn dịch vụ "Hộ chiếu" và ghi chú "Cần làm hộ chiếu nhanh (cần trong 2 ngày). Ngày bay dự kiến:" (chỉ kiểm tra, **không gửi**).
5. **Xe đưa đón** (`/dich-vu/thue-xe`): tuyến Núi Thần Tài có ảnh suối khoáng nóng, tuyến VinWonders Nam Hội An có ảnh VinWonders.
6. **Bài viết mới** (`/blog/lam-ho-chieu-nhanh-khi-sap-bay`): ảnh bìa là hộ chiếu cầm tay kèm vé máy bay; có khung "Nội dung chính" bên trái (trên điện thoại ở đầu bài), bấm một mục thì nhảy tới đúng phần; cuối bài có "Câu hỏi thường gặp".
7. Mở `/sitemap.xml`: có dòng `lam-ho-chieu-nhanh-khi-sap-bay` kèm `<lastmod>`.

### Bước 3: Xem các mục mới trong Dashboard (không lưu thay đổi nếu tôi chưa duyệt)
1. **Bảng giá & ưu đãi**: chụp màn hình phần "Ưu đãi" (đang bật, 500.000đ / 20 USD, các nhóm được tick) gửi tôi để xác nhận có giữ cấu hình này không.
2. **Ảnh & video**: chỉ xem, không đổi gì. Khi tôi gửi ảnh/video mới, bạn tải lên đúng ô và bấm "Lưu ảnh & video".
3. **Bài viết → Sửa** bài "Làm hộ chiếu nhanh khi sắp bay": khung "Kiểm tra SEO" phải hiện **100/100** và phần xem trước Google. Không bấm Lưu.

### Bước 4: Google Search Console (để Google tìm thấy bài viết nhanh hơn)
1. Mở https://search.google.com/search-console bằng tài khoản **ntkimhoan267@gmail.com** → **dừng lại để tôi tự đăng nhập** nếu cần.
2. Nếu chưa có property `tripdn.com`: chọn **Thêm tài sản → Miền (Domain)** → nhập `tripdn.com` → Google đưa một bản ghi **TXT**. **Gửi bản ghi đó cho tôi và dừng lại**; tôi sẽ tự thêm vào DNS (hoặc cho phép bạn thêm). Sau khi thêm, quay lại bấm **Xác minh**.
3. Khi đã xác minh: mục **Sơ đồ trang web (Sitemaps)** → nhập `sitemap.xml` → **Gửi**.
4. Mục **Kiểm tra URL**: dán `https://tripdn.com/blog/lam-ho-chieu-nhanh-khi-sap-bay` → **Yêu cầu lập chỉ mục**.
5. (Không bắt buộc) dán URL bài viết vào https://search.google.com/test/rich-results → chụp kết quả gửi tôi (mong đợi: nhận diện được Bài viết, Breadcrumb, Câu hỏi thường gặp).

### Báo cáo cuối
Liệt kê: Render đang chạy commit nào, kết quả từng mục ở Bước 2 – 4, ảnh chụp phần Ưu đãi, và mọi điều bất thường.

--- KẾT THÚC ---

## Ghi chú cho chủ website (không cần dán cho Cowork)

### Về ưu đãi "giá niêm yết + 500.000đ"
- Giá gõ được dạng `2800000`, `2.800.000`, `2,8tr`, `500k`. Ô sai (chữ, số âm, 0, số quá nhỏ) được tô đỏ và không lưu.
- Giá bạn nhập trong Dashboard là **giá thật**. Website tự cộng 500.000đ để làm giá niêm yết, nên **không nhập giá đã cộng sẵn**.
- Ưu đãi chỉ có ý nghĩa khi giá niêm yết là giá thật sự áp dụng cho khách **không** để lại thông tin (ví dụ khách đến thẳng văn phòng). Nếu mọi khách đều được báo giá thấp hơn thì đó là giảm giá ảo, dễ bị phàn nàn hoặc vi phạm quy định về quảng cáo, khuyến mại. Khi đó nên **tắt ưu đãi** (bỏ tick "Bật ưu đãi").
- Muốn áp dụng cho dịch thuật / xe đưa đón: tick nhóm tương ứng. Có thể đổi số tiền giảm (ví dụ 200.000đ cho dịch vụ giá thấp) nhưng một số tiền áp dụng chung cho mọi nhóm đang bật.

### Đổi giá
- Sửa trong **Dashboard → Bảng giá & ưu đãi**. Ô giá để trống = hiện "Liên hệ".
- Bảng đã sửa trong Dashboard sẽ không đổi theo file `src/data/services.js` nữa. Muốn quay về giá trong file, tick "Khôi phục giá mặc định của bảng này" rồi Lưu.
- Giá tour và ảnh tour vẫn sửa ở **Dashboard → Tour**.

### Viết bài chuẩn SEO (dặn nhân viên)
1. Chọn **1 từ khoá chính** khách hay gõ trên Google (ví dụ "làm visa Hàn Quốc Đà Nẵng").
2. Chia bài bằng `##` (mục) và `###` (mục con): website tự tạo mục lục. **Không dùng `#`** (một dấu).
3. Điền **tiêu đề Google** (30–60 ký tự) và **mô tả Google** (120–160 ký tự) có từ khoá.
4. Có ảnh bìa và **mô tả ảnh**; bài từ 800 chữ; 2–3 link tới trang dịch vụ của TRIP; 1 link nguồn chính thống; 2+ câu hỏi thường gặp.
5. Làm tới khi khung **Kiểm tra SEO** đạt từ 80/100. Chọn giao diện: bài dài, nhiều bước → **Hướng dẫn**; bài có ảnh đẹp → **Tạp chí**.
6. Muốn đăng vào giờ đẹp: điền **Ngày giờ đăng** trong tương lai rồi chọn "Xuất bản": bài tự hiện đúng giờ.

### Bài "Làm hộ chiếu nhanh khi sắp bay"
- Thông tin pháp lý trong bài đối chiếu đến 11/2026: thời hạn cấp 8 / 5 / 3 ngày làm việc (Điều 15 Luật Xuất cảnh, nhập cảnh 2019), bỏ điều kiện 6 tháng khi xuất cảnh từ 15/8/2023, lệ phí 200.000đ / 400.000đ, lệ phí 0đ qua VNeID từ 15/8/2026 đến 28/02/2027 (có điều kiện).
- Bài **không hứa** thời gian trả kết quả thay cơ quan nhà nước; bảng 1–7 ngày ghi "Liên hệ tư vấn". Nếu TRIP có giá cụ thể cho từng gói, nhập ở **Bảng giá → Hộ chiếu làm nhanh** và sửa bảng trong bài cho khớp.
