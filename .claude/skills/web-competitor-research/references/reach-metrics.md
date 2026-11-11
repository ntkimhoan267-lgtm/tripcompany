# Lấy từng số liệu REACH ở đâu

| Cột | Nguồn | Cách lấy | Khi không có |
|---|---|---|---|
| `fb_followers` | Fanpage Facebook (trang "Giới thiệu" hoặc đầu trang hiện "X người theo dõi") | WebFetch URL fanpage; nếu Facebook chặn, tìm Google `"<tên>" facebook người theo dõi` hoặc đọc qua trang "Tính minh bạch của trang" | Để trống, ghi `note=fb không đọc được` |
| `tiktok_followers` | tiktok.com/@tên | Đọc số Followers trên trang hồ sơ | Để trống nếu không có kênh |
| `youtube_subs` | youtube.com/@tên | Số người đăng ký | Để trống |
| `web_visits` | similarweb.com/website/<domain> | Chỉ ghi khi hiện "Total Visits"; web nhỏ thường "n/a" | Để trống (không phạt) |
| `google_top10` | Google search thủ công 8–12 từ khoá mục tiêu | Đếm số từ khoá mà domain đối thủ nằm trong 10 kết quả tự nhiên đầu (bỏ quảng cáo) | 0 nếu đã kiểm tra mà không có; trống nếu chưa kiểm tra |
| `maps_reviews` | Google Maps địa điểm | Số đánh giá (không phải điểm sao) | 0 nếu không có địa điểm |
| `same_target` | Suy luận từ bước 1 | 1 = bán cho cùng nhóm khách (cá nhân/doanh nghiệp, cùng khu vực/phân khúc) | Nếu không chắc: 1 và ghi note |

Ghi `checked_on` (ngày) cho mỗi dòng vì số thay đổi theo thời gian.

## Trọng số mặc định (có thể đổi)

```
fb_followers=0.30  google_top10=0.25  maps_reviews=0.15  web_visits=0.15  tiktok_followers=0.10  youtube_subs=0.05
```

Gợi ý theo ngành:
- F&B, spa, làm đẹp: `maps_reviews=0.25 tiktok_followers=0.20 fb_followers=0.30 google_top10=0.15 web_visits=0.05 youtube_subs=0.05`
- B2B, phần mềm: `web_visits=0.30 google_top10=0.30 fb_followers=0.15 youtube_subs=0.15 tiktok_followers=0.05 maps_reviews=0.05`
- Giáo dục: `fb_followers=0.30 youtube_subs=0.20 google_top10=0.20 tiktok_followers=0.15 web_visits=0.10 maps_reviews=0.05`
