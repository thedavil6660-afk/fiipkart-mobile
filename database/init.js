const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'fiipkart.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      original_price REAL NOT NULL,
      selling_price REAL NOT NULL,
      discount INTEGER,
      rating REAL DEFAULT 4.2,
      reviews_count INTEGER DEFAULT 120,
      image TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      is_featured INTEGER DEFAULT 0,
      is_demo INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_name TEXT,
      customer_phone TEXT,
      customer_address TEXT,
      items TEXT NOT NULL,
      total_amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT DEFAULT 'PENDING',
      transaction_ref TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('merchant_upi', 'fiipkartmerchant@icici')`);
  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('merchant_name', 'FIipkart Official')`);
  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('upi_gateway_enabled', '1')`);

  const defaultAdmin = 'Flipkart009@';
  const defaultPass = 'abhi123';
  bcrypt.hash(defaultPass, 10, (err, hash) => {
    if (!err) {
      db.run(`INSERT OR IGNORE INTO admins (id, username, password_hash) VALUES (1, ?, ?)`, [defaultAdmin, hash]);
    }
  });
});

module.exports = db;
