
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many attempts. Try again after 15 mins.' }
});

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', require('./routes/api'));
app.use('/api/admin/login', authLimiter);
app.use('/api/admin', require('./routes/admin'));

const seedProducts = require('./public/js/products.js').seedProducts;
const db = require('./database/init');

db.get('SELECT COUNT(*) AS count FROM products', (err, row) => {
  if (row && row.count === 0 && Array.isArray(seedProducts)) {
    const stmt = db.prepare(`
      INSERT INTO products (id, name, category, original_price, selling_price, discount, rating, reviews_count, image, description, is_demo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    seedProducts.forEach(p => {
      stmt.run(p.id, p.name, p.category, p.original_price, p.selling_price, p.discount, p.rating, p.reviews_count, p.image, p.description, p.is_demo ? 1 : 0);
    });
    stmt.finalize();
    console.log(`Database seeded with ${seedProducts.length} default products.`);
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`FIipkart running on port ${PORT}`);
});
