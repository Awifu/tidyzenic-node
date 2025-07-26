const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../db');
const transporter = require('../utils/mailer');

// === Email helper ===
const sendVerificationEmail = async (email, token) => {
  const link = `https://${process.env.APP_DOMAIN}/auth/verify?token=${token}`;
  const html = `
    <p>Welcome to Tidyzenic!</p>
    <p>Please verify your email address:</p>
    <a href="${link}">${link}</a>
  `;

  return transporter.sendMail({
    from: `"Tidyzenic" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify Your Email',
    html,
  });
};

// === POST /auth/register ===
router.post('/register', async (req, res) => {
  const { email, password, name, role = 'user', business_id } = req.body;

  if (!email || !password || password.length < 8 || !name || !business_id) {
    return res.status(400).json({ error: 'Missing or invalid fields.' });
  }

  try {
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND is_deleted = 0',
      [email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already in use.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const token = crypto.randomUUID(); // ✅ Unique verification token

    await pool.query(
      `INSERT INTO users (email, password_hash, name, role, business_id, is_verified, verification_token)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [email, password_hash, name, role, business_id, 0, token]
    );

    await sendVerificationEmail(email, token);

    res.status(201).json({ message: 'Account created. Please check your email to verify.' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// === GET /auth/verify?token=... ===
router.get('/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('Invalid verification link.');

  try {
    const [users] = await pool.query(
      'SELECT * FROM users WHERE verification_token = ?',
      [token]
    );

    if (!users.length) {
      return res.status(400).send('Invalid or expired token.');
    }

    await pool.query(
      'UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?',
      [users[0].id]
    );

    res.redirect(`https://${process.env.APP_DOMAIN}/verified.html`);
  } catch (err) {
    console.error('Verification error:', err.message);
    res.status(500).send('Server error during verification.');
  }
});

module.exports = router;
