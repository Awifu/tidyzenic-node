const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const transporter = require('../utils/mailer');

// === Send Verification Email ===
async function sendVerificationEmail(email, token) {
  const url = `https://${process.env.APP_DOMAIN}/auth/verify?token=${token}`;
  const html = `
    <p>Welcome to Tidyzenic!</p>
    <p>Please verify your email:</p>
    <a href="${url}">${url}</a>
  `;

  return transporter.sendMail({
    from: `"Tidyzenic" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify Your Email',
    html,
  });
}

// === POST /auth/register ===
router.post('/register', async (req, res) => {
  const { email, password, name, role = 'user', business_id } = req.body;
  if (!email || !password || !name || !business_id || password.length < 8) {
    return res.status(400).json({ error: 'Missing or invalid fields.' });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ? AND is_deleted = 0', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already in use.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const token = crypto.randomUUID();

    await pool.query(`
      INSERT INTO users (email, password_hash, name, role, business_id, is_verified, verification_token)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `, [email, password_hash, name, role, business_id, token]);

    await sendVerificationEmail(email, token);

    res.status(201).json({ message: 'Account created. Please verify your email.' });
  } catch (err) {
    console.error('❌ Register error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// === GET /auth/verify?token=... ===
router.get('/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('Invalid verification link.');

  try {
    const [users] = await pool.query('SELECT id FROM users WHERE verification_token = ?', [token]);
    if (!users.length) return res.status(400).send('Invalid or expired token.');

    await pool.query('UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?', [users[0].id]);

    res.redirect(`https://${process.env.APP_DOMAIN}/verified.html`);
  } catch (err) {
    console.error('❌ Verification error:', err.message);
    res.status(500).send('Server error during verification.');
  }
});

// === POST /auth/login ===
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ? AND is_deleted = 0', [email]);
    if (!users.length) return res.status(401).json({ error: 'Invalid credentials.' });

    const user = users[0];
    if (!user.is_verified) return res.status(403).json({ error: 'Verify your account first.' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials.' });

    const token = jwt.sign(
      { id: user.id, role: user.role, business_id: user.business_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ message: 'Login successful', role: user.role });
  } catch (err) {
    console.error('❌ Login error:', err.message);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

module.exports = router;
