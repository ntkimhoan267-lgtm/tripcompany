// Xuất bản xem trước TĨNH của website (chỉ giao diện) để đăng lên GitHub Pages.
// Form, Dashboard và cơ sở dữ liệu KHÔNG hoạt động ở bản này — chỉ để xem giao diện.
//
//   node scripts/export-static.js [thư-mục-ra] [base-path]
//   VD: node scripts/export-static.js dist-preview /tripcompany
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const outDir = path.resolve(process.argv[2] || 'dist-preview');
// An toàn: thư mục ra sẽ bị xoá trước khi xuất, nên không cho trỏ vào thư mục gốc dự án, thư mục hiện tại hay thư mục cha
const repoRoot = path.resolve(__dirname, '..');
if ([repoRoot, process.cwd(), path.parse(outDir).root, require('node:os').homedir()].some((p) => outDir === p || p.startsWith(outDir + path.sep))) {
  console.error(`Thư mục ra không an toàn: ${outDir}. Hãy dùng một thư mục con riêng, VD: dist-preview`);
  process.exit(1);
}
const base = (process.argv[3] || '/tripcompany').replace(/\/$/, '');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'trip-export-'));
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || require('node:crypto').randomBytes(12).toString('hex');
const app = require('../server');

// Đổi mọi đường dẫn tuyệt đối "/..." trong HTML thành "<base>/..." (GitHub Pages chạy dưới /<tên-repo>/)
function rewrite(html) {
  return html
    .replace(/(\s(?:href|src|poster|data-src|data-video-modal|action)=")\/(?!\/)/g, `$1${base}/`)
    .replace(/url\('\/(?!\/)/g, `url('${base}/`)
    .replace('<html lang="vi" class="no-js">', '<html lang="vi" class="no-js" data-preview="1">');
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name); const d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}

(async () => {
  const server = app.listen(0);
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    fs.rmSync(outDir, { recursive: true, force: true });
    copyDir(path.join(__dirname, '..', 'public'), outDir);

    const sitemap = await (await fetch(origin + '/sitemap.xml')).text();
    const routes = [...sitemap.matchAll(/<loc>[^<]*?(\/[^<]*)<\/loc>/g)].map((m) => new URL(m[1], origin).pathname);
    let count = 0;
    for (const route of new Set(routes)) {
      const res = await fetch(origin + route);
      if (!res.ok) { console.warn('Bỏ qua', route, res.status); continue; }
      const file = path.join(outDir, route === '/' ? '' : route, 'index.html');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, rewrite(await res.text()));
      count++;
    }
    const notFound = await (await fetch(origin + '/trang-khong-ton-tai')).text();
    fs.writeFileSync(path.join(outDir, '404.html'), rewrite(notFound));
    fs.writeFileSync(path.join(outDir, '.nojekyll'), '');
    console.log(`Đã xuất ${count} trang vào ${outDir} (base ${base})`);
  } finally {
    server.close();
    fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true });
  }
})();
