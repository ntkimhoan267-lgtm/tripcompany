// Sinh bản WebP nhiều kích cỡ cho ảnh minh hoạ trong public/img (dùng cho srcset):
//   public/img/tours/ba-na.jpg -> ba-na-480.webp, ba-na-800.webp, ba-na-1200.webp (không phóng to quá ảnh gốc)
// Chạy lại sau khi thêm / thay ảnh:  npm run images
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const { IMAGE_WIDTHS } = require('../src/lib/helpers');

const ROOT = path.join(__dirname, '..', 'public', 'img');
const DIRS = ['tours', 'visa', 'services', 'blog', 'home', 'team'];

(async () => {
  let made = 0;
  for (const d of DIRS) {
    const dir = path.join(ROOT, d);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!/\.(jpe?g|png)$/i.test(f)) continue;
      const src = path.join(dir, f);
      const base = src.replace(/\.(jpe?g|png)$/i, '');
      const { width } = await sharp(src).metadata();
      // Các cỡ chuẩn nhỏ hơn ảnh gốc + một bản bằng đúng cỡ gốc (ảnh lớn nhất vẫn nét)
      const widths = IMAGE_WIDTHS.filter((w) => w < width);
      widths.push(Math.min(width, IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1]));
      for (const w of widths) {
        const out = `${base}-${w}.webp`;
        if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs) continue;
        await sharp(src).resize({ width: w }).webp({ quality: 74 }).toFile(out);
        made++;
      }
    }
  }
  console.log(`Đã tạo ${made} ảnh WebP.`);
})().catch((e) => { console.error(e); process.exit(1); });
