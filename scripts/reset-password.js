// Đặt lại mật khẩu Dashboard (dùng sau khi khôi phục bản sao lưu, vì bản sao lưu không chứa mật khẩu).
//
//   NEW_PASSWORD='mật-khẩu-mới' node scripts/reset-password.js admin
//
// Chạy trên máy chủ có DATA_DIR trỏ tới thư mục chứa trip.db (trên Render: tab Shell, DATA_DIR=/var/data có sẵn).
// Mật khẩu lấy từ biến môi trường để không lộ trong lịch sử lệnh; nhớ xoá biến / đóng Shell sau khi chạy.
const bcrypt = require('bcryptjs');
const config = require('../src/config');
const db = require('../src/db');

const username = String(process.argv[2] || '').trim().toLowerCase();
const password = process.env.NEW_PASSWORD || '';
if (!username) {
  console.error('Thiếu tên đăng nhập. VD: NEW_PASSWORD=\'...\' node scripts/reset-password.js admin');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Đặt biến NEW_PASSWORD tối thiểu 8 ký tự.');
  process.exit(1);
}
const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
if (!user) {
  const list = db.prepare('SELECT username FROM users ORDER BY id').all().map((u) => u.username);
  console.error(`Không có tài khoản "${username}". Các tài khoản hiện có: ${list.join(', ') || '(chưa có)'}`);
  process.exit(1);
}
// Tăng session_version: mọi phiên đăng nhập cũ hết hiệu lực
db.prepare('UPDATE users SET password_hash = ?, session_version = session_version + 1 WHERE id = ?')
  .run(bcrypt.hashSync(password, config.bcryptCost), user.id);
console.log(`Đã đặt lại mật khẩu cho "${username}".`);
