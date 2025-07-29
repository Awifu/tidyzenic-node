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

// ✅ GET /api/support – Admin view: all support tickets for their business
router.get('/', async (req, res) => {
  const user = getUserFromToken(req);

  if (!user || user.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const [rows] = await pool.query(`
      SELECT 
        t.id,
        t.subject,
        t.message,
        t.status,
        t.created_at,
        u.name AS user_name,
        u.email AS user_email,
        b.email AS business_email
      FROM support_tickets t
      JOIN users u ON t.user_id = u.id
      JOIN businesses b ON t.business_id = b.id
      WHERE t.business_id = ?
      ORDER BY t.created_at DESC
    `, [user.business_id]);

    res.json(rows);
  } catch (err) {
    console.error('❌ Failed to fetch support tickets:', err);
    res.status(500).json({ error: 'Failed to load support tickets' });
  }
});

// ✅ PATCH /api/support/:id/resolve
router.patch('/:id/resolve', async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('UPDATE support_tickets SET status = ? WHERE id = ?', ['Resolved', id]);
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Error resolving ticket:', err);
    res.status(500).json({ message: 'Failed to resolve ticket' });
  }
});

// ✅ DELETE /api/support/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM support_tickets WHERE id = ?', [id]);
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Error deleting ticket:', err);
    res.status(500).json({ message: 'Failed to delete ticket' });
  }
});

// ✅ POST /api/support/:id/reply
router.post('/:id/reply', async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  const user = getUserFromToken(req);

  if (!user || user.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!message) {
    return res.status(400).json({ error: 'Reply message is required' });
  }

  try {
    // Store reply in support_replies (or log it in ticket)
    await pool.query(`
      INSERT INTO support_replies (ticket_id, admin_id, message, created_at)
      VALUES (?, ?, ?, NOW())
    `, [id, user.id, message]);

    // Optionally mark ticket as "Replied"
    await pool.query('UPDATE support_tickets SET status = ? WHERE id = ?', ['Replied', id]);

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Error sending reply:', err);
    res.status(500).json({ message: 'Failed to send reply' });
  }
});

module.exports = router;
