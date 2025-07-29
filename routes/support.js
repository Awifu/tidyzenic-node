// routes/support.js

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../db');

// Utility: extract user from JWT cookie
function getUserFromToken(req) {
  try {
    const token = req.cookies.token;
    if (!token) return null;
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

// GET /api/support – Admin view: all support tickets for their business
router.get('/', async (req, res) => {
  const user = getUserFromToken(req);

  if (!user || !user.id || !user.business_id || user.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const [rows] = await pool.query(`
      SELECT 
        t.id,
        t.subject,
        t.message,
        t.created_at,
        u.name AS user_name,
        u.email AS user_email
      FROM support_tickets t
      JOIN users u ON t.user_id = u.id
      WHERE t.business_id = ?
      ORDER BY t.created_at DESC
    `, [user.business_id]);

    res.json(rows);
  } catch (err) {
    console.error('❌ Failed to fetch support tickets:', err);
    res.status(500).json({ error: 'Failed to load support tickets' });
  }
});

module.exports = router;
