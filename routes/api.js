const express = require('express');
const router = express.Router();
const db = require('../database/init');

router.get('/products', (req, res) => {
  const { category, search, sort } = req.query;
  let sql = 'SELECT * FROM products WHERE is_active = 1';
  const params = [];

  if (category && category !== 'All') {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (search) {
    sql += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (sort === 'low_to_high') {
    sql += ' ORDER BY selling_price ASC';
  } else if (sort === 'high_to_low') {
    sql += ' ORDER BY selling_price DESC';
  } else {
    sql += ' ORDER BY id ASC';
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, products: rows });
  });
});

router.get('/products/:id', (req, res) => {
  db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (!row) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product: row });
  });
});

router.post('/orders/create', (req, res) => {
  const { cartItems, customerDetails, paymentMethod } = req.body;
  if (!cartItems || !cartItems.length) {
    return res.status(400).json({ success: false, message: 'Cart cannot be empty' });
  }

  const ids = cartItems.map(item => item.id);
  const placeholders = ids.map(() => '?').join(',');

  db.all(`SELECT id, name, selling_price FROM products WHERE id IN (${placeholders})`, ids, (err, products) => {
    if (err) return res.status(500).json({ success: false, error: err.message });

    let serverTotal = 0;
    const verifiedItems = [];

    cartItems.forEach(cartItem => {
      const match = products.find(p => p.id === cartItem.id);
      if (match) {
        const qty = Math.max(1, parseInt(cartItem.quantity, 10) || 1);
        serverTotal += match.selling_price * qty;
        verifiedItems.push({
          id: match.id,
          name: match.name,
          price: match.selling_price,
          quantity: qty
        });
      }
    });

    const orderId = 'OD' + Date.now() + Math.floor(100 + Math.random() * 900);
    const txnRef = 'TXN' + Math.random().toString(36).substring(2, 10).toUpperCase();

    db.get("SELECT value FROM settings WHERE key = 'merchant_upi'", (err, setting) => {
      const upiId = setting ? setting.value : 'fiipkartmerchant@icici';
      const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=FIipkart&am=${serverTotal.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Order ' + orderId)}`;

      db.run(
        `INSERT INTO orders (id, customer_name, customer_phone, customer_address, items, total_amount, payment_method, payment_status, transaction_ref)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
        [
          orderId,
          customerDetails ? customerDetails.name : 'Guest Buyer',
          customerDetails ? customerDetails.phone : 'Not Provided',
          customerDetails ? customerDetails.address : 'Not Provided',
          JSON.stringify(verifiedItems),
          serverTotal,
          paymentMethod || 'UPI',
          txnRef
        ],
        function(insertErr) {
          if (insertErr) return res.status(500).json({ success: false, error: insertErr.message });
          res.json({
            success: true,
            orderId,
            totalAmount: serverTotal,
            transactionRef: txnRef,
            upiIntentUrl: upiUri,
            merchantUpi: upiId
          });
        }
      );
    });
  });
});

router.post('/orders/verify', (req, res) => {
  const { orderId, transactionRef } = req.body;
  db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, order) => {
    if (err || !order) return res.status(404).json({ success: false, message: 'Order not found' });
    
    const isSuccess = Boolean(transactionRef);
    const updatedStatus = isSuccess ? 'PAID' : 'FAILED';

    db.run('UPDATE orders SET payment_status = ? WHERE id = ?', [updatedStatus, orderId], (updateErr) => {
      if (updateErr) return res.status(500).json({ success: false });
      res.json({ success: true, orderId, paymentStatus: updatedStatus });
    });
  });
});

module.exports = router;
