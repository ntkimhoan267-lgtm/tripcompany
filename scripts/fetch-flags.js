// Tải cờ quốc gia còn thiếu về public/img/flags (chạy khi thêm nước mới vào src/data/services.js):
//   npm run flags
const fs = require('node:fs');
const path = require('node:path');
const services = require('../src/data/services');

const DIR = path.join(__dirname, '..', 'public', 'img', 'flags');
// Mã cờ trong dữ liệu dịch vụ + các mã dùng trực tiếp trong giao diện
const codes = new Set(['vn', 'eu', 'us', 'cn', 'kr', 'jp', 'au']);
for (const v of Object.values(services)) if (Array.isArray(v)) for (const x of v) if (x && x.code) codes.add(x.code);

(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  let added = 0;
  for (const c of codes) {
    if (!/^[a-z]{2}$/.test(c)) continue;
    const out = path.join(DIR, `${c}.png`);
    if (fs.existsSync(out)) continue;
    const r = await fetch(`https://flagcdn.com/w80/${c}.png`);
    if (!r.ok) { console.warn(`Không tải được cờ ${c}: HTTP ${r.status}`); continue; }
    fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
    added++;
  }
  console.log(`Đã tải ${added} cờ mới (${codes.size} mã đang dùng).`);
})().catch((e) => { console.error(e); process.exit(1); });
