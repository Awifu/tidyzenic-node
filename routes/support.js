const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const pool = require('../db');

// 🔒 Extract user from JWT token in cookie
function getUserFromToken(req) {
  try {
    const token = req.cookies.token;
    if (!token) {
      console.warn('⚠️ No JWT token found');
      return null;
    }
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    console.error('❌ Invalid token:', err.message);
    return null;
  }
}

// 🛡️ Rate limiter for write actions
const supportLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 min
  max: 10,
  message: '⛔ Too many actions. Try again in 5 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ GET /api/support – Admin-only: list all tickets
router.get('/', async (req, res) => {
  const user = getUserFromToken(req);
  console.log('📥 GET /api/support | User:', user?.email || 'unknown');

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
    console.error('❌ DB error loading tickets:', err.stack || err.message);
    res.status(500).json({ error: 'Failed to load support tickets' });
  }
});

// ✅ PATCH /api/support/:id/resolve – Mark ticket resolved
router.patch('/:id/resolve', supportLimiter, async (req, res) => {
  const { id } = req.params;
  console.log(`🛠️ PATCH /support/${id}/resolve`);

  try {
    await pool.query('UPDATE support_tickets SET status = ? WHERE id = ?', ['Resolved', id]);
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Failed to resolve ticket:', err.message);
    res.status(500).json({ message: 'Failed to resolve ticket' });
  }
});

// ✅ DELETE /api/support/:id – Remove ticket
router.delete('/:id', supportLimiter, async (req, res) => {
  const { id } = req.params;
  console.log(`🗑️ DELETE /support/${id}`);

  try {
    await pool.query('DELETE FROM support_tickets WHERE id = ?', [id]);
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Failed to delete ticket:', err.message);
    res.status(500).json({ message: 'Failed to delete ticket' });
  }
});

// ✅ POST /api/support/:id/reply – Admin sends reply
router.post('/:id/reply', supportLimiter, async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  const user = getUserFromToken(req);

  console.log(`📨 POST /support/${id}/reply from admin ${user?.id}`);

  if (!user || user.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!message) {
    return res.status(400).json({ error: 'Reply message is required' });
  }

  try {
    await pool.query(`
      INSERT INTO support_replies (ticket_id, admin_id, message, created_at)
      VALUES (?, ?, ?, NOW())
    `, [id, user.id, message]);

    await pool.query('UPDATE support_tickets SET status = ? WHERE id = ?', ['Replied', id]);

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Reply failed:', err.stack || err.message);
    res.status(500).json({ message: 'Failed to send reply' });
  }
});
// ✅ PATCH /api/support/:id/edit – Inline edit a ticket field
router.patch('/:id/edit', supportLimiter, async (req, res) => {
  const { id } = req.params;
  const { field, value } = req.body;
  const user = getUserFromToken(req);

  if (!user || user.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const allowedFields = ['message', 'subject', 'status'];
  if (!allowedFields.includes(field)) {
    return res.status(400).json({ error: 'Invalid field' });
  }

  try {
    const [result] = await pool.query(
      `UPDATE support_tickets SET \`${field}\` = ? WHERE id = ?`,
      [value, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    console.log(`✅ Updated ticket ${id}: ${field} = ${value}`);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Failed to update ticket:', err.message);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

module.exports = router;
