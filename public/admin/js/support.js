// routes/support.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/support - Fetch all support tickets
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM support_tickets ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching support tickets:', err);
    res.status(500).json({ error: 'Failed to fetch support tickets' });
  }
});

// Optional: POST /api/support - Create a new ticket
router.post('/', async (req, res) => {
  const { subject, message, user_id } = req.body;
  if (!subject || !message || !user_id) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO support_tickets (user_id, subject, message) VALUES (?, ?, ?)',
      [user_id, subject, message]
    );
    res.status(201).json({ message: 'Ticket created', ticketId: result.insertId });
  } catch (err) {
    console.error('❌ Error creating support ticket:', err);
    res.status(500).json({ error: 'Failed to create support ticket' });
  }
});

module.exports = router;
