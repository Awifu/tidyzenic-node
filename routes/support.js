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

// Helper to extract user from JWT cookie
function getUserFromToken(req) {
  try {
    const token = req.cookies.token;
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch {
    return null;
  }
}

// POST /api/support — Submit support ticket
router.post('/', async (req, res) => {
  const { subject, message } = req.body;
  const user = getUserFromToken(req);

  if (!user || !user.id || !user.business_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!subject || !message) {
    return res.status(400).json({ error: '❌ Subject and message are required.' });
  }

  try {
    // Save to DB
    await pool.query(`
      INSERT INTO support_tickets (user_id, business_id, subject, message)
      VALUES (?, ?, ?, ?)
    `, [user.id, user.business_id, subject, message]);

    // Send notification email
    const userRow = await pool.query('SELECT email FROM users WHERE id = ?', [user.id]);
    const email = userRow[0][0]?.email || 'Unknown';

    await transporter.sendMail({
      from: `"${email}" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: `🆘 Support: ${subject}`,
      html: `<p><strong>User ID:</strong> ${user.id}</p><p><strong>Business ID:</strong> ${user.business_id}</p><p>${message.replace(/\n/g, '<br>')}</p>`
    });

    res.status(200).json({ message: '✅ Support ticket submitted.' });
  } catch (err) {
    console.error('❌ Support ticket error:', err);
    res.status(500).json({ error: '❌ Failed to submit ticket.' });
  }
});

// GET /api/support — Fetch tickets for logged-in user
router.get('/', async (req, res) => {
  const user = getUserFromToken(req);

  if (!user || !user.id || !user.business_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT subject, message, created_at
       FROM support_tickets
       WHERE business_id = ? AND user_id = ?
       ORDER BY created_at DESC`,
      [user.business_id, user.id]
    );

    res.json(rows);
  } catch (err) {
    console.error('❌ Support fetch error:', err);
    res.status(500).json({ error: '❌ Failed to load support tickets' });
  }
});

module.exports = router;
