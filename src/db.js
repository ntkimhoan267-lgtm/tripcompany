const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const config = require('./config');

fs.mkdirSync(config.dataDir, { recursive: true });
fs.mkdirSync(config.uploadDir, { recursive: true });

const db = new DatabaseSync(path.join(config.dataDir, 'trip.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  service TEXT NOT NULL,
  note TEXT,
  source_page TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  admin_note TEXT,
  sheet_synced INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);
CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  source_page TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  token TEXT NOT NULL,
  sheet_synced INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL DEFAULT '',
  cover TEXT,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS tours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  destination TEXT,
  region TEXT NOT NULL DEFAULT 'quoc-te',
  duration TEXT,
  departure TEXT,
  price INTEGER,
  image TEXT,
  highlights TEXT,
  itinerary TEXT,
  status TEXT NOT NULL DEFAULT 'published',
  featured INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS newsletters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  recipients INTEGER NOT NULL DEFAULT 0,
  result TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
-- Ghi nhận từng email đã nhận một bản tin (để gửi tiếp phần còn lại khi Gmail hết hạn mức trong ngày)
CREATE TABLE IF NOT EXISTS newsletter_sends (
  newsletter_id INTEGER NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (newsletter_id, email)
);
-- Đánh giá của khách: khách tự gửi (chờ duyệt) hoặc nhân viên nhập lại từ Zalo/Facebook/Google
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  service TEXT,
  rating INTEGER NOT NULL DEFAULT 5,
  content TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'web',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_synced ON leads(sheet_synced);
CREATE INDEX IF NOT EXISTS idx_subs_token ON subscribers(token);
CREATE INDEX IF NOT EXISTS idx_subs_synced ON subscribers(sheet_synced);
`);

// Nâng cấp schema cho database đã tạo từ phiên bản trước
const hasColumn = (table, col) => db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === col);
if (!hasColumn('users', 'session_version')) db.exec('ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 1');
// SĐT người đánh giá: chỉ để nhân viên xác minh, không bao giờ hiển thị công khai
if (!hasColumn('reviews', 'phone')) db.exec('ALTER TABLE reviews ADD COLUMN phone TEXT');
// Bản tin tạo từ phiên bản cũ (không theo dõi từng người nhận) coi như đã gửi xong, tránh gửi lại
if (!hasColumn('newsletters', 'batched')) db.exec('ALTER TABLE newsletters ADD COLUMN batched INTEGER NOT NULL DEFAULT 0');
// Trạng thái từng người nhận bản tin: 'sending' ghi TRƯỚC khi gọi Apps Script, 'sent' khi Apps Script xác nhận.
// Dòng 'sending' còn lại (lỗi mạng, server tắt giữa chừng) = chưa rõ đã nhận hay chưa -> không tự gửi lại để tránh trùng.
if (!hasColumn('newsletter_sends', 'status')) db.exec("ALTER TABLE newsletter_sends ADD COLUMN status TEXT NOT NULL DEFAULT 'sent'");

module.exports = db;
