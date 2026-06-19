// middleware/auth.js
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('🔐 Auth header:', authHeader ? 'EXISTS' : 'MISSING');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔑 Token received (first 20 chars):', token.substring(0, 20) + '...');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔑 Decoded token:', decoded);

    const result = await pool.query(
      'SELECT id, email, full_name, role FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found in database');
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = result.rows[0];
    console.log('✅ User authenticated:', req.user.email);
    console.log('✅ User role:', req.user.role);
    
    next();
  } catch (err) {
    console.error('❌ Auth error:', err);
    console.error('❌ Stack:', err.stack);
    return res.status(403).json({ error: 'Invalid token' });
  }
};