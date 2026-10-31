const path = require('node:path');
const fs = require('node:fs');

// Nạp file .env đơn giản (không cần thư viện dotenv)
const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const dataDir = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
const isProd = process.env.NODE_ENV === 'production';

// SESSION_SECRET dùng để ký cookie đăng nhập: production bắt buộc có, dài >= 32 ký tự và không phải giá trị mẫu
const PLACEHOLDER_SECRETS = ['thay-bang-chuoi-ngau-nhien-dai', 'dev-secret-change-me', 'changeme', 'secret'];
if (process.env.SESSION_SECRET && (process.env.SESSION_SECRET.length < 32 || PLACEHOLDER_SECRETS.includes(process.env.SESSION_SECRET))) {
  throw new Error('SESSION_SECRET quá ngắn hoặc là giá trị mẫu. Hãy dùng chuỗi ngẫu nhiên dài ít nhất 32 ký tự.');
}
if (isProd && !process.env.SESSION_SECRET) {
  throw new Error('Thiếu SESSION_SECRET trong biến môi trường (bắt buộc khi chạy production).');
}

module.exports = {
  isProd,
  port: Number(process.env.PORT) || 3000,
  siteUrl: (process.env.SITE_URL || 'https://tripdn.com').replace(/\/$/, ''),
  dataDir,
  uploadDir: path.join(dataDir, 'uploads'),
  // Không có SESSION_SECRET (chỉ cho phép khi chạy thử trên máy): dùng chuỗi ngẫu nhiên mỗi lần khởi động
  sessionSecret: process.env.SESSION_SECRET || require('node:crypto').randomBytes(32).toString('hex'),
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  googleScriptUrl: process.env.GOOGLE_SCRIPT_URL || '',
  googleScriptSecret: process.env.GOOGLE_SCRIPT_SECRET || '',
};
