# Khi nào không dùng stack mặc định

| Tình huống | Chọn | Lý do |
|---|---|---|
| Landing 1–3 trang, không Dashboard, form gửi Sheet | HTML/CSS/JS tĩnh + Apps Script hoặc Formspree; host GitHub Pages/Cloudflare Pages (0đ) | Không cần máy chủ, không cần DB |
| Chủ muốn tự sửa mọi thứ, có nhân sự quen WordPress | WordPress + theme nhẹ + ACF | Hệ sinh thái sẵn; nhưng phải cập nhật bảo mật thường xuyên |
| Bán hàng online nhiều sản phẩm, thanh toán | Nền tảng TMĐT (Haravan, Shopify, WooCommerce) | Giỏ hàng, thanh toán, vận chuyển đã có; tự code tốn kém |
| Ứng dụng web phức tạp, nhiều tương tác, cần SSR + React | Next.js + Postgres | Khi nội dung động và tương tác là trọng tâm |
| Website đa ngôn ngữ ngay từ đầu | Stack mặc định + i18n (thư mục locale, URL /en/) hoặc Astro | Astro rất tốt cho nội dung tĩnh đa ngôn ngữ |

Stack mặc định (Express + EJS + SQLite) phù hợp cho 80% website doanh nghiệp nhỏ Việt Nam:
chi phí ~7 USD/tháng, 1 repo, 1 dịch vụ, SEO tốt, Dashboard tuỳ biến đúng nhu cầu.
