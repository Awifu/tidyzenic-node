// routes/support.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const [tickets] = await pool.query(
      'SELECT id, subject, message, email, status, created_at FROM support_tickets ORDER BY created_at DESC'
    );
    res.json(tickets);
  } catch (error) {
    console.error('❌ Failed to fetch support tickets:', error);
    res.status(500).json({ error: 'Failed to fetch support tickets' });
  }
});

module.exports = router;
