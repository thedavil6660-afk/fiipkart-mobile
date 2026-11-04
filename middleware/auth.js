const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'fiipkart_super_secret_jwt_key_2025_prod';

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ success: false, message: 'Access token required' });
  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid or expired session token' });
    req.user = user;
    next();
  });
};
