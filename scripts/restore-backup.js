// Khôi phục bản sao lưu (file zip tải từ Dashboard > Cài đặt > Sao lưu dữ liệu) vào DATA_DIR.
//
//   node scripts/restore-backup.js /var/data/backup.zip
//
// - Giữ lại dữ liệu hiện tại thành trip.db.truoc-khoi-phuc-<thời gian> và uploads.truoc-khoi-phuc-<thời gian>.
// - Chỉ giải nén trip.db và uploads/<tên file>; bỏ qua mọi đường dẫn lạ (chống file zip độc hại ghi ra ngoài thư mục).
// - Xong phải KHỞI ĐỘNG LẠI website, rồi đặt lại mật khẩu bằng scripts/reset-password.js.
const fs = require('node:fs');
const path = require('node:path');
const yauzl = require('yauzl');

const zipPath = process.argv[2];
const dataDir = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
if (!zipPath || !fs.existsSync(zipPath)) {
  console.error('Cách dùng: node scripts/restore-backup.js <đường-dẫn-file-zip>');
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const allowed = (name) => name === 'trip.db' || /^uploads\/[\w.-]+$/.test(name);

yauzl.open(zipPath, { lazyEntries: true }, (err, zip) => {
  if (err) { console.error('Không mở được file zip:', err.message); process.exit(1); }
  const entries = [];
  zip.on('entry', (e) => { entries.push(e); zip.readEntry(); });
  zip.on('end', () => {
    if (!entries.some((e) => e.fileName === 'trip.db')) { console.error('File zip không có trip.db — không phải bản sao lưu TRIP.'); process.exit(1); }
    // Giữ lại dữ liệu hiện tại
    const dbFile = path.join(dataDir, 'trip.db');
    const upDir = path.join(dataDir, 'uploads');
    if (fs.existsSync(dbFile)) fs.renameSync(dbFile, `${dbFile}.truoc-khoi-phuc-${stamp}`);
    for (const ext of ['-wal', '-shm']) if (fs.existsSync(dbFile + ext)) fs.renameSync(dbFile + ext, `${dbFile}${ext}.truoc-khoi-phuc-${stamp}`);
    if (fs.existsSync(upDir)) fs.renameSync(upDir, `${upDir}.truoc-khoi-phuc-${stamp}`);
    fs.mkdirSync(upDir, { recursive: true });

    yauzl.open(zipPath, { lazyEntries: true }, (err2, z2) => {
      if (err2) { console.error(err2.message); process.exit(1); }
      let count = 0;
      z2.on('entry', (e) => {
        if (!allowed(e.fileName)) { z2.readEntry(); return; }
        const out = path.join(dataDir, e.fileName);
        z2.openReadStream(e, (e3, stream) => {
          if (e3) { console.error(e3.message); process.exit(1); }
          stream.pipe(fs.createWriteStream(out)).on('finish', () => { count++; z2.readEntry(); });
        });
      });
      z2.on('end', () => {
        console.log(`Đã khôi phục ${count} file vào ${dataDir}.`);
        console.log(`Dữ liệu cũ được giữ lại với đuôi ".truoc-khoi-phuc-${stamp}".`);
        console.log('Tiếp theo: KHỞI ĐỘNG LẠI website, rồi đặt mật khẩu: NEW_PASSWORD=\'...\' node scripts/reset-password.js admin');
      });
      z2.readEntry();
    });
  });
  zip.readEntry();
});
