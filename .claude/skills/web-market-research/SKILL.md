---
name: web-market-research
description: >-
  Bước 1 của quy trình xây website (website-builder) – nghiên cứu thị trường và khách hàng mục tiêu
  cho một doanh nghiệp ở bất kỳ ngành nào, kể cả khi người dùng "không rõ" và yêu cầu Claude tự tìm
  hiểu. Dùng khi cần xác định khách hàng mục tiêu, nhu cầu, từ khoá họ tìm trên Google, kênh họ dùng
  (Facebook, Zalo, TikTok, Google Maps), mùa vụ, giá thị trường, trước khi viết brief hoặc chọn đối
  thủ. Kích hoạt với các câu như "khách hàng của tôi là ai", "thị trường ngành X ở Đà Nẵng thế nào",
  "nghiên cứu thị trường cho website", "tìm hiểu nhu cầu khách".
---

# Nghiên cứu thị trường & khách hàng mục tiêu

Mục đích: biết **ai** sẽ vào website, họ **tìm gì**, **ở đâu**, và **điều gì khiến họ tin** để chọn
doanh nghiệp này. Kết quả ghi vào `docs/website/01-thi-truong.md`. Toàn bộ việc tìm kiếm Claude tự
làm bằng WebSearch/WebFetch; người dùng chỉ cần xác nhận hoặc bổ sung tài liệu nội bộ.

## Đầu vào

- Ngành, sản phẩm/dịch vụ chính, khu vực (tỉnh/thành, hoặc toàn quốc, hoặc nước ngoài).
- Tài liệu nội bộ nếu có: bảng giá, bộ nhận diện, phân tích SWOT/TOWS, dữ liệu khách cũ.
  Ở TRIP, bảng báo giá và tài liệu TOWS trong Google Drive là nguồn chính; đọc chúng trước khi tìm ngoài.

## Các việc cần làm (theo thứ tự)

### 1. Chân dung khách hàng (2–3 nhóm)
Với mỗi nhóm: họ là ai (tuổi, nghề, vị trí địa lý), tình huống khiến họ cần dịch vụ, câu hỏi họ
đặt ra, nỗi lo khi chọn nhà cung cấp, họ hay liên hệ bằng kênh nào (gọi, Zalo, inbox, form).
Nguồn: hội nhóm Facebook ngành (đọc câu hỏi thật), bình luận trên fanpage đối thủ, Google
"people also ask", bài review. Trích **nguyên văn** 5–10 câu hỏi/than phiền thật của khách để dùng
làm nội dung sau này.

### 2. Từ khoá & nhu cầu tìm kiếm
- Liệt kê 15–30 từ khoá theo 3 ý định: tìm hiểu ("thủ tục...", "có cần..."), so sánh ("giá...",
  "...uy tín"), hành động ("dịch vụ ... tại <thành phố>", "...gần đây").
- Ước lượng độ cạnh tranh bằng cách xem ai đang đứng top 10 (đối thủ lớn hay bài báo chung chung).
  Không bịa số lượt tìm kiếm; nếu có Google Keyword Planner/Ahrefs do người dùng cung cấp thì ghi
  nguồn, không thì ghi "ước lượng định tính".
- Đánh dấu từ khoá sẽ thành **trang dịch vụ** (ý định hành động) và từ khoá thành **bài blog**
  (ý định tìm hiểu). Đây là đầu vào trực tiếp cho sitemap ở `web-brief`.

### 3. Kênh & hành vi
Khách vào website từ đâu: Facebook/Zalo (đa số doanh nghiệp địa phương VN), Google, TikTok,
Google Maps, giới thiệu. Suy ra: mobile-first, thanh liên hệ nổi, tốc độ tải, có cần trang đích
riêng cho quảng cáo không.

### 4. Giá & cách niêm yết trên thị trường
Khảo sát 5–10 nơi: họ công khai giá không, dạng "từ", bảng chi tiết hay "liên hệ". Kết luận cho
doanh nghiệp này nên công khai mức nào (TRIP: công khai giá khách lẻ, giấu giá đại lý, kết quả là
điểm khác biệt về minh bạch).

### 5. Mùa vụ & sự kiện
Tháng cao điểm, dịp lễ, thay đổi chính sách (ví dụ visa: quy định mới của lãnh sự; F&B: Tết; giáo
dục: khai giảng). Dùng cho lịch nội dung và popup ưu đãi.

### 6. Khoảng trống thị trường
Điều khách cần mà đối thủ chưa làm tốt (ở TRIP: đối thủ visa lớn không có dịch thuật; đối thủ tour
không ghi giá/người). Ghi 3–5 khoảng trống; đây là "góc tấn công" của website.

## Kết quả: `docs/website/01-thi-truong.md`

```
# Thị trường & khách hàng – <tên doanh nghiệp>
Ngày · Trạng thái · Nguồn đã dùng (liệt kê URL)

## 1. Tóm tắt 10 dòng
## 2. Chân dung khách hàng (bảng: nhóm | tình huống | câu hỏi | nỗi lo | kênh)
## 3. Câu nói thật của khách (trích dẫn + nguồn)
## 4. Từ khoá (bảng: từ khoá | ý định | trang/bài đích | ai đang top)
## 5. Kênh & hành vi → yêu cầu cho website
## 6. Giá trên thị trường → đề xuất cách niêm yết
## 7. Mùa vụ
## 8. Khoảng trống thị trường (góc tấn công)
## 9. Cần xác nhận (đánh số)
```

## Lưu ý

- Ghi nguồn cho mọi con số. Số không có nguồn thì không ghi.
- Thời gian hợp lý: 1–2 giờ cho doanh nghiệp địa phương, nửa ngày cho thị trường toàn quốc.
- Nếu người dùng đã có dữ liệu khách (Sheet lead cũ, CRM), phân tích nó trước: dịch vụ nào hỏi
  nhiều nhất, giờ nào hỏi, kênh nào; dữ liệu thật quan trọng hơn nghiên cứu bên ngoài.
