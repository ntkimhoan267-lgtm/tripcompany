# Hosting, tên miền, Google

## Render (khuyên dùng, ~7 USD/tháng gồm ổ đĩa)
- `render.yaml`: `type: web`, `env: node`, `region: singapore`, `plan: starter`, `healthCheckPath: /healthz`,
  `disk: {name: <app>-data, mountPath: /var/data, sizeGB: 1}`, `envVars`: NODE_VERSION, DATA_DIR=/var/data,
  SITE_URL, SESSION_SECRET (generateValue), ADMIN_PASSWORD, GOOGLE_SCRIPT_URL, GOOGLE_SCRIPT_SECRET, TRUST_PROXY.
- New → Blueprint → chọn repo → nhập biến → Deploy. Settings → Build & Deploy: xem nhánh deploy.
- Custom Domains: lấy IP cho bản ghi A (`domain.vn`) và CNAME (`www` → `<app>.onrender.com`). HTTPS tự cấp.
- Events: deploy mới nhất phải ứng với commit mới nhất; nếu không: Manual Deploy → Deploy latest commit.

## VPS (Ubuntu)
`git clone` → `npm ci --omit=dev` → `.env` → `pm2 start npm --name app -- start` → Nginx reverse proxy 3000
→ certbot HTTPS. `DATA_DIR` trên ổ bền; cron sao lưu hằng ngày.

## Tên miền (Mắt Bão, PA, Tenten, Cloudflare)
- A record: `@` → IP Render; CNAME: `www` → `<app>.onrender.com`. TTL 300 khi đang chuyển.
- Bật **gia hạn tự động**; ghi ngày hết hạn vào `08-trien-khai.md`.
- Cloudflare proxy (đám mây cam): đặt SSL "Full (strict)"; TRUST_PROXY tăng thêm 1 bậc.

## TRUST_PROXY
Bật tạm `SHOW_CLIENT_IP=1`, mở `/__ip`: đếm vị trí IP thật của bạn (so với api.ipify.org) trong chuỗi
`"xff"` **tính từ cuối** (cuối cùng = 1) → đặt `TRUST_PROXY` = số đó. Xong thì xoá `SHOW_CLIENT_IP`.

## Google Apps Script (Sheet + Gmail, không cần Google Cloud)
script.google.com (tài khoản Gmail của doanh nghiệp) → dự án mới → dán `Code.gs` → Project Settings →
Script properties: `<APP>_SECRET` (= GOOGLE_SCRIPT_SECRET) → Deploy → New deployment → Web app, Execute as
Me, Who has access: Anyone → chép URL `/exec` vào Render. Lần sau cập nhật code: Manage deployments → Edit →
New version (giữ nguyên URL). Dashboard → Cài đặt → Kiểm tra kết nối.

## Google Search Console
Thêm tài sản dạng Miền → bản ghi TXT (người dùng tự thêm DNS) → Xác minh → Sitemaps: `sitemap.xml` →
Kiểm tra URL → Yêu cầu lập chỉ mục cho trang/bài mới. Rich Results Test cho bài có FAQ.
