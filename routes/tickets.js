const express = require('express');
const router = express.Router();
const db = require('../db');

// =========================
// GET all tickets
// =========================
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT id, user_id, business_id, subject, message, status, created_at
      FROM support_tickets
      WHERE is_deleted = 0
      ORDER BY created_at DESC
    `);
    res.json({ tickets: rows });
  } catch (err) {
    console.error('[GET /tickets] Error:', err);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// =========================
// POST a new ticket
// =========================
router.post('/', async (req, res) => {
  const { user_id, business_id, subject, message } = req.body;
  if (!subject || !message || !user_id || !business_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const [result] = await db.execute(`
      INSERT INTO support_tickets (user_id, business_id, subject, message, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `, [user_id, business_id, subject, message]);

    const newTicket = {
      id: result.insertId,
      user_id,
      business_id,
      subject,
      message,
      status: 'Open',
      created_at: new Date()
    };

    const io = req.app.get('io');
    io.emit('new_ticket', newTicket);

    res.status(201).json(newTicket);
  } catch (err) {
    console.error('[POST /tickets] Error:', err);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// =========================
// POST a reply to a ticket
// =========================
router.post('/:id/replies', async (req, res) => {
  const ticketId = req.params.id;
  const { admin_id, message } = req.body;

  if (!admin_id || !message) {
    return res.status(400).json({ error: 'Missing admin_id or message' });
  }

  try {
    await db.execute(`
      INSERT INTO support_replies (ticket_id, admin_id, message, created_at)
      VALUES (?, ?, ?, NOW())
    `, [ticketId, admin_id, message]);

    res.status(201).json({ success: true, message: 'Reply submitted' });
  } catch (err) {
    console.error(`[POST /tickets/${ticketId}/replies] Error:`, err);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

// =========================
// GET all replies for a ticket
// =========================
router.get('/:id/replies', async (req, res) => {
  const ticketId = req.params.id;

  try {
    const [replies] = await db.execute(`
      SELECT id, ticket_id, admin_id, message, created_at
      FROM support_replies
      WHERE ticket_id = ?
      ORDER BY created_at ASC
    `, [ticketId]);

    res.json({ replies });
  } catch (err) {
    console.error(`[GET /tickets/${ticketId}/replies] Error:`, err);
    res.status(500).json({ error: 'Failed to fetch replies' });
  }
});

module.exports = router;
