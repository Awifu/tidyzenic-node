// routes/tickets.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const { sendMail } = require('../utils/mailer');

// ==========================
// GET: All active support tickets with business info
// ==========================
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
    console.error('❌ Error fetching tickets:', err);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// ==========================
// POST: Create a new support ticket
// ==========================
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

    // Send email to business owner
    const [[business]] = await db.execute(
      'SELECT email, business_name FROM businesses WHERE id = ?',
      [business_id]
    );

    if (business?.email) {
      await sendMail({
        to: business.email,
        subject: `🆘 New Support Ticket – ${subject}`,
        html: `
          <h2>New Support Ticket</h2>
          <p><strong>Business:</strong> ${business.business_name}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong> ${message}</p>
        `,
      });
    }

    const io = req.app.get('io');
    io.emit('new_ticket', newTicket);

    res.status(201).json(newTicket);
  } catch (err) {
    console.error('❌ Error creating ticket:', err);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// ==========================
// POST: Add a reply to a specific ticket
// ==========================
router.post('/:id/replies', async (req, res) => {
  const ticketId = req.params.id;
  const { business_id, message } = req.body;

  if (!business_id || !message) {
    return res.status(400).json({ error: 'Missing business_id or message' });
  }

  try {
    await db.execute(`
      INSERT INTO support_replies (ticket_id, business_id, message, created_at)
      VALUES (?, ?, ?, NOW())
    `, [ticketId, business_id, message]);

    // Fetch original ticket and user info
    const [[ticket]] = await db.execute(`
      SELECT t.subject, t.message AS original_msg, u.email AS user_email, b.business_name
      FROM support_tickets t
      LEFT JOIN users u ON u.id = t.user_id
      LEFT JOIN businesses b ON b.id = t.business_id
      WHERE t.id = ?
    `, [ticketId]);

    if (ticket?.user_email) {
      await sendMail({
        to: ticket.user_email,
        subject: `💬 Reply to Your Ticket – ${ticket.subject}`,
        html: `
          <p>You have a new reply to your ticket:</p>
          <blockquote>${message}</blockquote>
          <p><strong>Original Message:</strong> ${ticket.original_msg}</p>
          <br><p>— ${ticket.business_name} Support</p>
        `,
      });
    }

    res.status(201).json({ success: true, message: 'Reply submitted' });
  } catch (err) {
    console.error('❌ Error posting reply:', err);
    res.status(500).json({ error: 'Failed to post reply' });
  }
});

// ==========================
// GET: All replies for a specific ticket
// ==========================
router.get('/:id/replies', async (req, res) => {
  const ticketId = req.params.id;

  try {
    const [replies] = await db.execute(`
      SELECT r.*, b.business_name
      FROM support_replies r
      LEFT JOIN businesses b ON r.business_id = b.id
      WHERE r.ticket_id = ?
      ORDER BY r.created_at ASC
    `, [ticketId]);

    res.json({ replies });
  } catch (err) {
    console.error('❌ Error fetching replies:', err);
    res.status(500).json({ error: 'Failed to fetch replies' });
  }
});

// ==========================
// PUT: Update ticket status (Open <-> Resolved)
// ==========================
router.put('/:id/status', async (req, res) => {
  const ticketId = req.params.id;
  const { status } = req.body;

  if (!['Open', 'Resolved'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    await db.execute(`
      UPDATE support_tickets SET status = ? WHERE id = ?
    `, [status, ticketId]);

    res.json({ success: true, message: `Ticket marked as ${status}`, status });
  } catch (err) {
    console.error('❌ Error updating ticket status:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// ==========================
// DELETE: Soft-delete a ticket
// ==========================
router.delete('/:id', async (req, res) => {
  const ticketId = req.params.id;

  try {
    await db.execute(`
      UPDATE support_tickets SET is_deleted = 1 WHERE id = ?
    `, [ticketId]);

    res.json({ success: true, message: 'Ticket deleted' });
  } catch (err) {
    console.error('❌ Error deleting ticket:', err);
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
});

module.exports = router;
