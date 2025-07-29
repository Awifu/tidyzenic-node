const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const transporter = require('../utils/mailer');

// === Helper: Send Email Verification ===
async function sendVerificationEmail(email, token) {
  const link = `https://${process.env.APP_DOMAIN}/auth/verify?token=${token}`;
  const html = `
    <p>Welcome to Tidyzenic!</p>
    <p>Please verify your email by clicking the link below:</p>
    <a href="${link}">${link}</a>
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
  const { email, password, name, business_id, role = 'user' } = req.body;

  if (!email || !password || !name || !business_id || password.length < 8) {
    return res.status(400).json({ error: 'Missing or invalid registration fields.' });
  }

  try {
    const [exists] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND is_deleted = 0',
      [email]
    );

    if (exists.length > 0) {
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
    console.error('❌ Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// === GET /auth/verify?token=... ===
router.get('/verify', async (req, res) => {
  const { token } = req.query;

  if (!token) return res.status(400).send('Invalid or missing verification token.');

  try {
    const [users] = await pool.query(
      'SELECT id FROM users WHERE verification_token = ?',
      [token]
    );

    if (!users.length) return res.status(400).send('Token expired or invalid.');

    await pool.query(
      'UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?',
      [users[0].id]
    );

    res.redirect(`https://${process.env.APP_DOMAIN}/verified.html`);
  } catch (err) {
    console.error('❌ Email verification error:', err);
    res.status(500).send('Server error during verification.');
  }
});

// === POST /auth/login ===
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND is_deleted = 0',
      [email]
    );

    if (!users.length) return res.status(401).json({ error: 'Invalid credentials.' });

    const user = users[0];

    if (!user.is_verified) {
      return res.status(403).json({ error: 'Please verify your email first.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials.' });

    const token = jwt.sign(
      { id: user.id, role: user.role, business_id: user.business_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // === Set cookie for subdomain-wide authentication ===
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,                // Always use secure for 'SameSite: None'
      sameSite: 'None',            // Required for cross-subdomain cookies
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      domain: '.tidyzenic.com'     // Makes it available to all subdomains
    });

    const [biz] = await pool.query(
      'SELECT subdomain FROM businesses WHERE id = ? LIMIT 1',
      [user.business_id]
    );

    if (!biz.length) return res.status(404).json({ error: 'Business not found.' });

    const redirect = `https://${biz[0].subdomain}.tidyzenic.com/admin/dashboard.html`;

    res.json({ message: 'Login successful', redirect });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

module.exports = router;
