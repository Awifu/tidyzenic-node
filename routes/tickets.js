const express = require('express');
const router = express.Router();
const db = require('../db'); // Assumes you use a MySQL pool or connection file

// ===================
// GET all tickets
// ===================
router.get('/', async (req, res) => {
  try {
    const [tickets] = await db.execute(
      'SELECT * FROM support_tickets WHERE is_deleted = 0 ORDER BY created_at DESC'
    );
    res.json({ tickets });
  } catch (err) {
    console.error('Error fetching tickets:', err);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// ===================
// POST a new ticket (future public route)
// ===================
router.post('/', async (req, res) => {
  const { user_id, business_id, subject, message } = req.body;
  try {
    const [result] = await db.execute(
      'INSERT INTO support_tickets (user_id, business_id, subject, message, created_at) VALUES (?, ?, ?, ?, NOW())',
      [user_id, business_id, subject, message]
    );

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

  if (!message || !admin_id) {
    return res.status(400).json({ error: 'Missing message or admin_id' });
  }

  try {
    await db.execute(
      'INSERT INTO support_replies (ticket_id, admin_id, message, created_at) VALUES (?, ?, ?, NOW())',
      [ticketId, admin_id, message]
    );

    res.status(201).json({ success: true, message: 'Reply submitted' });
  } catch (err) {
    console.error('Error submitting reply:', err);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});
// ===================
// GET all replies for a ticket
// ===================
router.get('/:id/replies', async (req, res) => {
  const ticketId = req.params.id;

  try {
    const [replies] = await db.execute(
      'SELECT * FROM support_replies WHERE ticket_id = ? ORDER BY created_at ASC',
      [ticketId]
    );

    res.json({ replies });
  } catch (err) {
    console.error('Error fetching replies:', err);
    res.status(500).json({ error: 'Failed to load replies' });
  }
});
// ===================
// DELETE a ticket (soft delete)
// ===================
router.delete('/:id', async (req, res) => {
  const ticketId = req.params.id;
  try {
    await db.execute(
      'UPDATE support_tickets SET is_deleted = 1 WHERE id = ?',
      [ticketId]
    );
    res.json({ success: true, message: 'Ticket deleted' });
  } catch (err) {
    console.error('Error deleting ticket:', err);
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
});

// ===================
// UPDATE ticket content
// ===================
router.put('/:id', async (req, res) => {
  const ticketId = req.params.id;
  const { subject, message } = req.body;

  if (!subject || !message) {
    return res.status(400).json({ error: 'Subject and message are required' });
  }

  try {
    await db.execute(
      'UPDATE support_tickets SET subject = ?, message = ? WHERE id = ?',
      [subject, message, ticketId]
    );
    res.json({ success: true, message: 'Ticket updated' });
  } catch (err) {
    console.error('Error updating ticket:', err);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

module.exports = router;
