---
name: web-competitor-research
description: >-
  Bước 2 của quy trình xây website – tự tìm 10–15 đối thủ, đo "REACH" (độ phủ thật sự tới khách
  hàng: người theo dõi Facebook/TikTok/YouTube, lượt truy cập web, thứ hạng Google, đánh giá Google
  Maps), lọc đối thủ CÙNG khách hàng mục tiêu, chọn ra 3–5 đối thủ REACH cao nhất và mổ xẻ website
  của họ thành bảng "Lấy / Tránh" để làm theo. Dùng khi người dùng nói "tìm đối thủ", "học theo web
  của ai", "đối thủ cạnh tranh", "ai đang làm tốt nhất ngành này", "chọn 3-5 web mẫu", kể cả khi họ
  nói "tôi không rõ, tìm giúp tôi". Có script scripts/reach_score.py để chấm điểm từ CSV.
---

# Chọn 3–5 đối thủ REACH cao nhất và học theo

Người dùng thường không biết đối thủ nào đáng học. Skill này làm **toàn bộ** việc tìm, đo, chọn
và phân tích; người dùng chỉ duyệt danh sách cuối. Kết quả: `docs/website/02-doi-thu.md` và
`docs/website/02-doi-thu.csv`.

## Định nghĩa REACH

REACH = mức độ một đối thủ thực sự **chạm tới khách hàng mục tiêu**, đo bằng 6 tín hiệu công khai:

| Tín hiệu | Cột CSV | Tại sao |
|---|---|---|
| Người theo dõi Facebook (fanpage chính) | `fb_followers` | Kênh số 1 của khách VN địa phương |
| Người theo dõi TikTok | `tiktok_followers` | Kênh phát hiện dịch vụ của nhóm 18–35 |
| Người đăng ký YouTube | `youtube_subs` | Nội dung dài, uy tín ngành |
| Lượt truy cập web / tháng (ước lượng) | `web_visits` | Độ mạnh SEO + quảng cáo |
| Số từ khoá mục tiêu đang top 10 Google | `google_top10` | Chạm đúng khách đang có nhu cầu |
| Số đánh giá Google Maps | `maps_reviews` | Khách thật đã dùng (địa phương) |

Thêm 2 cột định tính: `same_target` (1 nếu cùng khách hàng mục tiêu, 0 nếu khác, ví dụ cùng
ngành nhưng bán cho doanh nghiệp thay vì cá nhân) và `note`.

Điểm REACH = trung bình có trọng số của từng tín hiệu sau khi lấy log và quy về 0–100 theo tỉ lệ so
với đối thủ cao nhất trong nhóm (script làm việc này). Trọng số mặc định ưu tiên Facebook và Google vì đó là nơi
khách Việt Nam tìm dịch vụ; đổi trọng số bằng tham số `--weights` khi ngành khác (ví dụ F&B tăng
TikTok và Maps; B2B tăng web và Google).

## Quy trình (Claude tự làm, không hỏi lại từng bước)

### 1. Lập danh sách 10–15 ứng viên
Tìm theo 4 hướng, ghi nguồn mỗi tên:
- Google từ khoá hành động của bước 1 (ví dụ "dịch vụ visa Đà Nẵng", "làm visa Trung Quốc"):
  10 kết quả đầu, bỏ báo chí/sàn.
- Google Maps cùng từ khoá + khu vực: 10 địa điểm đầu.
- Facebook: tìm fanpage theo tên dịch vụ + khu vực; TikTok: hashtag ngành.
- Đối thủ người dùng tự nêu (luôn thêm, kể cả nhỏ).
Loại ngay: không hoạt động 6 tháng, không cùng khu vực/khách (ghi `same_target=0` thay vì xoá, để
người dùng thấy lý do).

### 2. Thu thập số liệu
Đọc `references/reach-metrics.md` để biết lấy từng số ở đâu và ghi gì khi không có. Quy tắc:
- Số lấy trực tiếp từ trang công khai (fanpage hiện "X người theo dõi", TikTok hiện followers,
  Maps hiện số đánh giá). Ghi ngày xem.
- `web_visits` chỉ ghi khi Similarweb có dữ liệu; không thì để trống, script tự bỏ qua cột trống
  cho ứng viên đó (không phạt).
- `google_top10`: tự kiểm tra 8–12 từ khoá mục tiêu, đếm số từ khoá đối thủ xuất hiện top 10.
- Không bao giờ ước đoán một con số rồi ghi như thật. Ô trống là câu trả lời hợp lệ.

Lưu vào `docs/website/02-doi-thu.csv` với đúng tên cột ở bảng trên (cột đầu là `name`, thêm `url`,
`fb_url`, `checked_on`).

### 3. Chấm điểm và chọn
```bash
python3 .claude/skills/web-competitor-research/scripts/reach_score.py docs/website/02-doi-thu.csv --top 5
```
Script in bảng xếp hạng (chỉ `same_target=1`), điểm từng tín hiệu và REACH tổng. Chọn **3–5** tên
đầu; nếu hạng 3 và 4 sát nhau thì lấy cả hai. Luôn giữ ít nhất 1 đối thủ **cùng quy mô** với người
dùng (REACH có thể thấp hơn nhưng bài học khả thi hơn), ghi rõ lý do.

### 4. Mổ xẻ website từng đối thủ đã chọn
Mở từng website (WebFetch; nếu chặn thì đọc Google cache/mô tả) và điền `references/analysis-template.md`:
sitemap & menu, hero (tiêu đề, CTA, có form không), cách thu lead, cách hiện giá, tín hiệu tin
cậy, thanh liên hệ, blog/SEO (có title riêng? schema?), tốc độ (PageSpeed), điểm yếu rõ ràng.
Kết thúc bằng bảng **Lấy / Tránh** cho từng đối thủ, giống bảng ở brief TRIP:

| Đối thủ | Lấy | Tránh |
|---|---|---|
| Tân Văn Lang | tách Visa đi và Visa inbound; thanh liên hệ nổi; quiz "kiểm tra khả năng đậu" thu lead; dòng minh bạch "không phải cơ quan nhà nước" | menu 40 nước rối; nhiều hotline; hero không có CTA |
| Vietravel | hotline cố định trên header; tag tour theo mùa; dải tin cậy ở footer | quá nhiều nhãn |
| Saigontourist | thẻ tour: ảnh, badge số ngày, "Giá từ", nút Chi tiết; bộ lọc/sắp xếp | không ghi giá/người; trang danh sách thiếu form |

### 5. Tổng hợp "điều phải làm" cho website mới
Từ bảng Lấy/Tránh, rút 10–15 yêu cầu cụ thể chuyển sang `web-brief` (ví dụ: "hero có form 3
trường", "giá hiện dạng thẻ theo tab", "mỗi dịch vụ có khung gọi trực tiếp tư vấn viên"). Mỗi yêu
cầu ghi học từ ai. Đây là đầu ra quan trọng nhất của bước này.

## Kết quả: `docs/website/02-doi-thu.md`

```
# Đối thủ cạnh tranh – <doanh nghiệp>
Ngày · Trạng thái · Từ khoá đã dùng để tìm · Trọng số REACH đã dùng
## 1. Danh sách ứng viên (bảng từ CSV, kèm same_target và lý do)
## 2. Xếp hạng REACH (bảng script in ra)
## 3. 3–5 đối thủ được chọn và lý do
## 4. Phân tích từng đối thủ (theo analysis-template)
## 5. Bảng Lấy / Tránh
## 6. Yêu cầu chuyển sang brief (10–15 dòng, ghi nguồn học)
## 7. Cần xác nhận
```

## Lưu ý đạo đức & pháp lý
Học cấu trúc, cách trình bày, luồng thu lead. **Không** sao chép nội dung, ảnh, logo, tên thương
hiệu, hoặc nói xấu đối thủ trên website mới. Không dùng công cụ cào dữ liệu vi phạm điều khoản nền
tảng; chỉ đọc những gì công khai với mọi người.
