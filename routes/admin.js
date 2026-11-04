const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/init');
const auth = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'fiipkart_super_secret_jwt_key_2025_prod';

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM admins WHERE username = ?', [username], (err, admin) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    if (!admin) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    bcrypt.compare(password, admin.password_hash, (hashErr, matches) => {
      if (hashErr || !matches) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
      const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '8h' });
      res.json({ success: true, token, username: admin.username });
    });
  });
});

router.get('/metrics', auth, (req, res) => {
  const metrics = {};
  db.get('SELECT COUNT(*) AS total_products FROM products', (e1, r1) => {
    metrics.totalProducts = r1 ? r1.total_products : 0;
    db.get('SELECT COUNT(*) AS total_orders, SUM(total_amount) AS revenue FROM orders WHERE payment_status = "PAID"', (e2, r2) => {
      metrics.totalOrders = r2 ? r2.total_orders : 0;
      metrics.totalRevenue = r2 && r2.revenue ? r2.revenue : 0;
      res.json({ success: true, metrics });
    });
  });
});

router.get('/products', auth, (req, res) => {
  db.all('SELECT * FROM products ORDER BY id DESC', (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, products: rows });
  });
});

router.post('/products', auth, (req, res) => {
  const { name, category, original_price, selling_price, image, description, is_demo } = req.body;
  const discount = Math.round(((original_price - selling_price) / original_price) * 100);

  db.run(
    `INSERT INTO products (name, category, original_price, selling_price, discount, image, description, is_demo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, category, original_price, selling_price, discount, image, description, is_demo ? 1 : 0],
    function(err) {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true, id: this.lastID });
    }
  );
});

router.put('/products/:id', auth, (req, res) => {
  const { name, category, original_price, selling_price, image, description, is_active } = req.body;
  const discount = Math.round(((original_price - selling_price) / original_price) * 100);

  db.run(
    `UPDATE products SET name = ?, category = ?, original_price = ?, selling_price = ?, discount = ?, image = ?, description = ?, is_active = ?
     WHERE id = ?`,
    [name, category, original_price, selling_price, discount, image, description, is_active, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true, updated: this.changes });
    }
  );
});

router.delete('/products/:id', auth, (req, res) => {
  db.run('DELETE FROM products WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, deleted: this.changes });
  });
});

router.get('/settings/upi', auth, (req, res) => {
  db.all("SELECT key, value FROM settings WHERE key IN ('merchant_upi', 'merchant_name', 'upi_gateway_enabled')", (err, rows) => {
    if (err) return res.status(500).json({ success: false });
    const config = {};
    rows.forEach(r => { config[r.key] = r.value; });
    res.json({ success: true, config });
  });
});

router.post('/settings/upi', auth, (req, res) => {
  const { merchant_upi, merchant_name, upi_gateway_enabled } = req.body;
  db.serialize(() => {
    if (merchant_upi) db.run("REPLACE INTO settings (key, value) VALUES ('merchant_upi', ?)", [merchant_upi]);
    if (merchant_name) db.run("REPLACE INTO settings (key, value) VALUES ('merchant_name', ?)", [merchant_name]);
    if (upi_gateway_enabled !== undefined) db.run("REPLACE INTO settings (key, value) VALUES ('upi_gateway_enabled', ?)", [String(upi_gateway_enabled)]);
  });
  res.json({ success: true, message: 'UPI settings saved successfully' });
});

router.get('/orders', auth, (req, res) => {
  db.all('SELECT * FROM orders ORDER BY created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, orders: rows });
  });
});

router.patch('/orders/:id/status', auth, (req, res) => {
  const { status } = req.body;
  db.run('UPDATE orders SET payment_status = ? WHERE id = ?', [status, req.params.id], function(err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, updated: this.changes });
  });
});

module.exports = router;
