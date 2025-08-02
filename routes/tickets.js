const express = require('express');
const router = express.Router();
const db = require('../db');

// ===================
// GET all active tickets (with business info)
// ===================
router.get('/', async (req, res) => {
  try {
    const [tickets] = await db.execute(`
      SELECT t.*, b.business_name 
      FROM support_tickets t
      JOIN businesses b ON t.business_id = b.id
      WHERE t.is_deleted = 0
      ORDER BY t.created_at DESC
    `);

    res.json({ tickets });
  } catch (err) {
    console.error('Error fetching tickets:', err);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// ===================
// POST a new support ticket
// ===================
router.post('/', async (req, res) => {
  const { user_id, business_id, subject, message } = req.body;

  if (!user_id || !business_id || !subject || !message) {
    return res.status(400).json({ error: 'All fields are required' });
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
    console.error('Error creating ticket:', err);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// ===================
// POST a reply to a ticket
// ===================
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
    console.error('Error posting reply:', err);
    res.status(500).json({ error: 'Failed to post reply' });
  }
});

// ===================
// GET all replies for a specific ticket
// ===================
router.get('/:id/replies', async (req, res) => {
  const ticketId = req.params.id;

  try {
    const [replies] = await db.execute(`
      SELECT r.*, a.username AS admin_name
      FROM support_replies r
      LEFT JOIN admins a ON r.admin_id = a.id
      WHERE r.ticket_id = ?
      ORDER BY r.created_at ASC
    `, [ticketId]);

    res.json({ replies });
  } catch (err) {
    console.error('Error fetching replies:', err);
    res.status(500).json({ error: 'Failed to fetch replies' });
  }
});

// ===================
// Mark a ticket as resolved
// ===================
router.post('/:id/resolve', async (req, res) => {
  const ticketId = req.params.id;

  try {
    await db.execute(`
      UPDATE support_tickets SET status = 'Resolved' WHERE id = ?
    `, [ticketId]);

    res.json({ success: true, message: 'Ticket marked as resolved' });
  } catch (err) {
    console.error('Error resolving ticket:', err);
    res.status(500).json({ error: 'Failed to resolve ticket' });
  }
});

// ===================
// Soft-delete a ticket
// ===================
router.delete('/:id', async (req, res) => {
  const ticketId = req.params.id;

  try {
    await db.execute(`
      UPDATE support_tickets SET is_deleted = 1 WHERE id = ?
    `, [ticketId]);

    res.json({ success: true, message: 'Ticket deleted' });
  } catch (err) {
    console.error('Error deleting ticket:', err);
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
});

module.exports = router;
