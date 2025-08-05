// routes/supportReplies.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const transporter = require('../utils/mailer');

// ============================
// POST: Reply to a support ticket
// ============================
router.post('/:ticketId', async (req, res) => {
  const ticketId = req.params.ticketId;
  const { business_id, message } = req.body;

  if (!business_id || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Save reply to DB
    await db.execute(
      `INSERT INTO support_replies (ticket_id, business_id, message, created_at) VALUES (?, ?, ?, NOW())`,
      [ticketId, business_id, message]
    );

    // Get original ticket info
    const [[ticket]] = await db.execute(
      `SELECT t.subject, t.message AS original_message, t.business_id, b.email AS business_email, b.owner_name, b.business_name
       FROM support_tickets t
       JOIN businesses b ON t.business_id = b.id
       WHERE t.id = ?`,
      [ticketId]
    );

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Notify business owner
    await transporter.sendMail({
      to: ticket.business_email,
      subject: `📩 New Reply to Support Ticket: ${ticket.subject}`,
      html: `
        <p>Hello ${ticket.owner_name || 'Business Owner'},</p>
        <p>You have a new reply to your support ticket:</p>
        <p><strong>Subject:</strong> ${ticket.subject}</p>
        <p><strong>Reply:</strong></p>
        <blockquote>${message}</blockquote>
        <p>Please log in to your dashboard to reply or mark this ticket as resolved.</p>
        <hr>
        <p style="font-size: 12px; color: #888">Tidyzenic Support</p>
      `
    });

    res.status(201).json({ success: true, message: 'Reply sent and email notification delivered' });
  } catch (err) {
    console.error('❌ Error submitting support reply:', err);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

module.exports = router;
