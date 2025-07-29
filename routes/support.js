const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../db');

// Utility: Extract user from JWT cookie
function getUserFromToken(req) {
  try {
    const token = req.cookies.token;
    if (!token) {
      console.warn('⚠️ No token found in cookies');
      return null;
    }
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    console.error('❌ Invalid JWT token:', err.message);
    return null;
  }
}

// ✅ GET /api/support – Fetch all tickets for admin
router.get('/', async (req, res) => {
  const user = getUserFromToken(req);
  console.log('📥 Authenticated user:', user);

  if (!user || user.role !== 'admin') {
    console.warn('🚫 Unauthorized access attempt to /api/support');
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
    console.error('❌ Failed to fetch support tickets:', err.stack || err.message);
    res.status(500).json({ error: 'Failed to load support tickets' });
  }
});

// ✅ PATCH /api/support/:id/resolve – Mark as resolved
router.patch('/:id/resolve', async (req, res) => {
  const { id } = req.params;
  console.log(`🛠️ Resolving ticket ID: ${id}`);

  try {
    await pool.query('UPDATE support_tickets SET status = ? WHERE id = ?', ['Resolved', id]);
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Error resolving ticket:', err.stack || err.message);
    res.status(500).json({ message: 'Failed to resolve ticket' });
  }
});

// ✅ DELETE /api/support/:id – Permanently delete a ticket
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`🗑️ Deleting ticket ID: ${id}`);

  try {
    await pool.query('DELETE FROM support_tickets WHERE id = ?', [id]);
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Error deleting ticket:', err.stack || err.message);
    res.status(500).json({ message: 'Failed to delete ticket' });
  }
});

// ✅ POST /api/support/:id/reply – Send reply
router.post('/:id/reply', async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  const user = getUserFromToken(req);

  console.log(`📨 Replying to ticket ID: ${id} | Admin ID: ${user?.id}`);

  if (!user || user.role !== 'admin') {
    console.warn('🚫 Unauthorized reply attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!message) {
    console.warn('⚠️ Missing reply message in body');
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
    console.error('❌ Error sending reply:', err.stack || err.message);
    res.status(500).json({ message: 'Failed to send reply' });
  }
});

module.exports = router;
