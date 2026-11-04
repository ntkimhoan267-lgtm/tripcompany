// Khôi phục bản sao lưu (file zip tải từ Dashboard > Cài đặt > Sao lưu dữ liệu) vào DATA_DIR.
//
//   node scripts/restore-backup.js /var/data/backup.zip
//
// - Giải nén vào thư mục tạm trước; chỉ khi MỌI file giải nén thành công mới đổi chỗ với dữ liệu hiện tại
//   (lỗi giữa chừng không để lại dữ liệu khôi phục dở dang).
// - Dữ liệu hiện tại được giữ lại thành trip.db.truoc-khoi-phuc-<thời gian> và uploads.truoc-khoi-phuc-<thời gian>.
// - Chỉ nhận trip.db và uploads/<tên file>; bỏ qua mọi đường dẫn lạ; giới hạn dung lượng (chống zip bomb).
// - Xong phải KHỞI ĐỘNG LẠI website, rồi đặt lại mật khẩu bằng scripts/reset-password.js.
const fs = require('node:fs');
const path = require('node:path');
const yauzl = require('yauzl');

const MAX_FILE = 2 * 1024 ** 3;   // 2 GB mỗi file
const MAX_TOTAL = 5 * 1024 ** 3;  // 5 GB tổng cộng

const zipPath = process.argv[2];
const dataDir = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
const fail = (msg) => { console.error('KHÔNG khôi phục được: ' + msg + '\nDữ liệu hiện tại KHÔNG bị thay đổi.'); process.exit(1); };
if (!zipPath || !fs.existsSync(zipPath)) {
  console.error('Cách dùng: node scripts/restore-backup.js <đường-dẫn-file-zip>');
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const allowed = (name) => name === 'trip.db' || /^uploads\/[\w.-]+$/.test(name);
const staging = path.join(dataDir, `.khoi-phuc-${stamp}`);

function extract() {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zip) => {
      if (err) return reject(new Error('file zip hỏng hoặc không phải zip (' + err.message + ')'));
      let total = 0; let count = 0; let hasDb = false;
      zip.on('error', (e) => reject(new Error('file zip hỏng (' + e.message + ')')));
      zip.on('entry', (e) => {
        if (!allowed(e.fileName)) { zip.readEntry(); return; }
        if (e.uncompressedSize > MAX_FILE) return reject(new Error(`file ${e.fileName} quá lớn`));
        total += e.uncompressedSize;
        if (total > MAX_TOTAL) return reject(new Error('tổng dung lượng giải nén quá lớn'));
        zip.openReadStream(e, (e2, stream) => {
          if (e2) return reject(new Error(`không đọc được ${e.fileName} (${e2.message})`));
          const out = fs.createWriteStream(path.join(staging, e.fileName));
          stream.on('error', (e3) => reject(new Error(`lỗi khi giải nén ${e.fileName} (${e3.message})`)));
          out.on('error', (e3) => reject(new Error(`không ghi được ${e.fileName} (${e3.message})`)));
          out.on('finish', () => { count++; if (e.fileName === 'trip.db') hasDb = true; zip.readEntry(); });
          stream.pipe(out);
        });
      });
      zip.on('end', () => (hasDb ? resolve(count) : reject(new Error('file zip không có trip.db — không phải bản sao lưu TRIP'))));
      zip.readEntry();
    });
  });
}

(async () => {
  fs.mkdirSync(path.join(staging, 'uploads'), { recursive: true });
  let count;
  try { count = await extract(); } catch (e) { fs.rmSync(staging, { recursive: true, force: true }); fail(e.message); }

  // Mọi file đã giải nén xong -> giữ lại dữ liệu hiện tại rồi đưa bản khôi phục vào chỗ
  const dbFile = path.join(dataDir, 'trip.db');
  const upDir = path.join(dataDir, 'uploads');
  if (fs.existsSync(dbFile)) fs.renameSync(dbFile, `${dbFile}.truoc-khoi-phuc-${stamp}`);
  for (const ext of ['-wal', '-shm']) if (fs.existsSync(dbFile + ext)) fs.renameSync(dbFile + ext, `${dbFile}${ext}.truoc-khoi-phuc-${stamp}`);
  if (fs.existsSync(upDir)) fs.renameSync(upDir, `${upDir}.truoc-khoi-phuc-${stamp}`);
  fs.renameSync(path.join(staging, 'trip.db'), dbFile);
  fs.renameSync(path.join(staging, 'uploads'), upDir);
  fs.rmSync(staging, { recursive: true, force: true });

  console.log(`Đã khôi phục ${count} file vào ${dataDir}.`);
  console.log(`Dữ liệu cũ được giữ lại với đuôi ".truoc-khoi-phuc-${stamp}".`);
  console.log('Tiếp theo: KHỞI ĐỘNG LẠI website, rồi đặt mật khẩu: NEW_PASSWORD=\'...\' node scripts/reset-password.js admin');
})();
