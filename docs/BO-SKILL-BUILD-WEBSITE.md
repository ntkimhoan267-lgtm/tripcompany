# Bộ Skill xây website đa ngành (rút từ dự án TRIP)

Bộ skill nằm trong `.claude/skills/`. Khi mở repo này bằng Claude Code (hoặc chép thư mục
`.claude/skills/` sang dự án khác, hay vào `~/.claude/skills/` để dùng cho mọi dự án), Claude tự
nạp skill phù hợp theo câu bạn gõ. Bạn không cần nhớ tên skill; chỉ cần nói việc muốn làm.

## Các skill và câu gọi mẫu

| Bước | Skill | Bạn chỉ cần nói | Kết quả |
|---|---|---|---|
| Điều phối | `website-builder` | "Làm website cho phòng khám nha khoa của tôi ở Huế, tôi không rõ bắt đầu từ đâu" | Hỏi 5 điều tối thiểu, chạy lần lượt 8 bước, lưu kết quả vào `docs/website/` |
| 1 | `web-market-research` | "Khách hàng của tôi là ai, họ tìm gì trên Google?" | `01-thi-truong.md`: chân dung khách, từ khoá, kênh, mùa vụ, khoảng trống |
| 2 | `web-competitor-research` | "Tìm 3–5 đối thủ có reach cao nhất để học theo, tôi không rõ, làm giúp tôi" | `02-doi-thu.csv` + `02-doi-thu.md`: xếp hạng REACH, bảng Lấy/Tránh, yêu cầu cho brief |
| 3 | `web-brief` | "Viết brief/prompt website để tôi duyệt" | `03-brief.md` 11 mục + danh sách cần xác nhận |
| 4 | `web-design` | "Thiết kế giao diện, chụp cho tôi xem" | `04-thiet-ke.md` + ảnh chụp 390/768/1300px |
| 5 | `web-build` | "Code website và dashboard theo brief" | Mã nguồn, test, README |
| 6 | `web-content-seo` | "Viết bài chuẩn SEO / lên top Google" | Nội dung thật, schema, sitemap, quy tắc cho nhân viên |
| 7 | `web-qa` | "Kiểm tra toàn bộ website trước khi lên mạng" | `07-kiem-tra.md`: 5 vòng, nhật ký lỗi, nghiệm thu |
| 8 | `web-launch` | "Deploy lên Render, trỏ tên miền, viết hướng dẫn cho Cowork" | `08-trien-khai.md`, `HUONG-DAN-COWORK-*.md` |

## Cách đo "REACH" và chọn đối thủ

REACH là độ phủ thật sự tới khách hàng, chấm từ 6 số công khai: người theo dõi Facebook, TikTok,
YouTube, lượt truy cập web (Similarweb), số từ khoá mục tiêu đang top 10 Google, số đánh giá
Google Maps. Claude tự tìm 10–15 ứng viên, điền vào CSV (mẫu:
`.claude/skills/web-competitor-research/assets/doi-thu-mau.csv`), rồi chạy:

```bash
python3 .claude/skills/web-competitor-research/scripts/reach_score.py docs/website/02-doi-thu.csv --top 5
```

Script bỏ những đối thủ không cùng khách hàng mục tiêu (`same_target=0`), chuẩn hoá từng số về
0–100, nhân trọng số theo ngành và in bảng xếp hạng. Ô không có dữ liệu để trống, không bị phạt
và không được đoán. Sau đó Claude mổ xẻ website của 3–5 đối thủ đầu bảng thành bảng "Lấy / Tránh"
giống bảng đã dùng cho TRIP (Tân Văn Lang, Vietravel, Saigontourist).

## Nguyên tắc chung mà mọi skill tuân theo
1. Không bịa số liệu, đánh giá, giá, cam kết. Thiếu thì ghi "cần xác nhận".
2. Chỉ đưa thông tin công khai lên web (không giá đại lý, hoa hồng, chính sách nội bộ).
3. Một nguồn dữ liệu cho giá và thông tin công ty; mọi trang đọc từ đó.
4. Mobile-first, tiếng Việt có dấu, thanh liên hệ nổi, không ngắt dòng từ ghép.
5. Mỗi bước kết thúc bằng danh sách "Cần xác nhận" đánh số để bạn trả lời nhanh.
6. Việc thao tác trên trình duyệt (DNS, Google, hosting) luôn viết thành tài liệu cho Cowork với
   quy tắc: không nhập mật khẩu, không tự thanh toán, không tự đổi DNS.

## Dùng cho dự án khác
```bash
cp -r .claude/skills /duong-dan/du-an-moi/.claude/
```
Hoặc dùng toàn cục: `cp -r .claude/skills/* ~/.claude/skills/`. Mở dự án mới, gõ
"Làm website cho <doanh nghiệp>" là đủ.
