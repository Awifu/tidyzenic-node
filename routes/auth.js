const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db');
const transporter = require('../utils/mailer');

const router = express.Router();

// === Utility Functions ===
const generateJWT = (payload, expiresIn = '1d') =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });

const generateResetToken = () => crypto.randomBytes(32).toString('hex');

const buildResetLink = (token) =>
  `https://${process.env.APP_DOMAIN}/reset-password.html?token=${token}`;

const buildVerificationLink = (token) =>
  `https://${process.env.APP_DOMAIN}/auth/verify?token=${token}`;

const sendResetEmail = async (email, token) => {
  const link = buildResetLink(token);
  return transporter.sendMail({
    from: `"Tidyzenic Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Password Reset Instructions',
    html: `
      <p>Hello,</p>
      <p>You requested a password reset. Click the link below:</p>
      <a href="${link}">${link}</a>
      <p>This link expires in 30 minutes.</p>
    `,
  });
};

const sendVerificationEmail = async (email, token) => {
  const link = buildVerificationLink(token);
  return transporter.sendMail({
    from: `"Tidyzenic Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify Your Tidyzenic Account',
    html: `
      <p>Welcome to Tidyzenic!</p>
      <p>Please verify your email by clicking below:</p>
      <a href="${link}">${link}</a>
    `,
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

    const [result] = await pool.query(
      `INSERT INTO users (email, password_hash, name, role, business_id)
       VALUES (?, ?, ?, ?, ?)`,
      [email, password_hash, name, role, business_id]
    );

    const userId = result.insertId;

    const token = generateJWT({
      id: userId,
      email,
      business_id,
    }, '1d');

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
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userId = payload.id;

    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);

    if (!users.length)
      return res.status(404).send('User not found.');

    if (users[0].is_verified)
      return res.redirect(`https://${process.env.APP_DOMAIN}/verified.html`);

    await pool.query(
      'UPDATE users SET is_verified = 1 WHERE id = ?',
      [userId]
    );

    res.redirect(`https://${process.env.APP_DOMAIN}/verified.html`);
  } catch (err) {
    console.error('Verification error:', err.message);
    res.status(400).send('Invalid or expired token.');
  }
});

// === Other routes (login, forgot-password, reset-password, logout, resend-verification) ===
// (you can keep them as is — no changes needed unless you want JWT for reset too)

module.exports = router;
