// routes/support.js

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../db');

// 🔐 Get logged-in user from JWT cookie
function getUserFromToken(req) {
  try {
    const token = req.cookies.token;
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch {
    return null;
  }
}

// ✅ GET /api/support — Admin-only: view all support tickets
router.get('/', async (req, res) => {
  const user = getUserFromToken(req);

  if (!user || user.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const [tickets] = await pool.query(`
      SELECT 
        t.subject, t.message, t.created_at,
        u.name AS user_name, u.email AS user_email
      FROM support_tickets t
      JOIN users u ON u.id = t.user_id
      WHERE t.business_id = ?
      ORDER BY t.created_at DESC
    `, [user.business_id]);

    res.json(tickets);
  } catch (err) {
    console.error('❌ Support fetch error:', err);
    res.status(500).json({ error: '❌ Failed to load support tickets' });
  }
});
