// routes/support.js

const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// Email transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Helper: Decode user from JWT
function getUserFromToken(req) {
  try {
    const token = req.cookies.token;
    if (!token) return null;
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

// === POST /api/support ===
// Submit a support ticket
router.post('/', async (req, res) => {
  const { subject, message } = req.body;
  const user = getUserFromToken(req);

  if (!user?.id || !user?.business_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!subject || !message) {
    return res.status(400).json({ error: '❌ Subject and message are required.' });
  }

  try {
    await pool.query(`
      INSERT INTO support_tickets (user_id, business_id, subject, message)
      VALUES (?, ?, ?, ?)
    `, [user.id, user.business_id, subject, message]);

    const [[userInfo]] = await pool.query(
      'SELECT email FROM users WHERE id = ?',
      [user.id]
    );

    await transporter.sendMail({
      from: `"${userInfo?.email || 'Unknown'}" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: `🆘 Support: ${subject}`,
      html: `
        <p><strong>User ID:</strong> ${user.id}</p>
        <p><strong>Business ID:</strong> ${user.business_id}</p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `
    });

    res.status(200).json({ message: '✅ Support ticket submitted.' });
  } catch (err) {
    console.error('❌ Support ticket error:', err);
    res.status(500).json({ error: '❌ Failed to submit ticket.' });
  }
});

// === GET /api/support ===
// Fetch tickets for the current user
router.get('/', async (req, res) => {
  console.log('📥 GET /api/support hit');
  const user = getUserFromToken(req);

  if (!user?.id || !user?.business_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const [tickets] = await pool.query(
      `SELECT subject, message, created_at
       FROM support_tickets
       WHERE user_id = ? AND business_id = ?
       ORDER BY created_at DESC`,
      [user.id, user.business_id]
    );

    res.json(tickets);
  } catch (err) {
    console.error('❌ Support fetch error:', err);
    res.status(500).json({ error: '❌ Failed to load support tickets' });
  }
});

module.exports = router;
