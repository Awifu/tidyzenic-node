const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db');
const transporter = require('../utils/mailer');

const router = express.Router();

// ========== Utility Functions ==========
const generateJWT = (payload, expiresIn = '7d') =>
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

// ========== Routes ==========

// --- POST /auth/login ---
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required.' });

  try {
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND is_deleted = 0',
      [email]
    );

    if (!users.length)
      return res.status(401).json({ error: 'Invalid credentials.' });

    const user = users[0];

    if (!user.is_verified)
      return res.status(403).json({ error: 'Please verify your account first.' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      return res.status(401).json({ error: 'Invalid credentials.' });

    const token = generateJWT({
      user_id: user.id,
      email: user.email,
      role: user.role,
      business_id: user.business_id,
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({ role: user.role });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// --- POST /auth/forgot-password ---
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  try {
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND is_deleted = 0',
      [email]
    );

    if (!users.length) {
      const [biz] = await pool.query('SELECT id FROM businesses WHERE email = ?', [email]);
      if (biz.length) {
        return res.status(400).json({
          error: 'This email is linked to a business. Please register again or contact support.',
        });
      }
      return res.status(404).json({ error: 'No account found with that email.' });
    }

    const token = generateResetToken();
    const expiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await pool.query(
      'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
      [token, expiry, users[0].id]
    );

    await sendResetEmail(email, token);

    res.json({ message: 'Password reset email sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// --- POST /auth/reset-password ---
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || newPassword.length < 8)
    return res.status(400).json({ error: 'Invalid or weak password.' });

  try {
    const [users] = await pool.query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()',
      [token]
    );

    if (!users.length)
      return res.status(400).json({ error: 'Invalid or expired token.' });

    const hashed = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
      [hashed, users[0].id]
    );

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Reset error:', err);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// --- POST /auth/resend-verification ---
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  try {
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND is_verified = 0 AND is_deleted = 0',
      [email]
    );

    if (!users.length)
      return res.status(400).json({ error: 'No unverified account found for this email.' });

    const user = users[0];
    const token = user.verification_token || crypto.randomUUID();

    if (!user.verification_token) {
      await pool.query(
        'UPDATE users SET verification_token = ? WHERE id = ?',
        [token, user.id]
      );
    }

    await sendVerificationEmail(email, token);

    res.json({ message: 'Verification email sent.' });
  } catch (err) {
    console.error('Resend verification error:', err);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// --- GET /auth/verify?token=... ---
router.get('/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('Invalid verification link.');

  try {
    const [users] = await pool.query(
      'SELECT * FROM users WHERE verification_token = ?',
      [token]
    );

    if (!users.length)
      return res.status(400).send('Invalid or expired token.');

    await pool.query(
      'UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?',
      [users[0].id]
    );

    res.redirect(`https://${process.env.APP_DOMAIN}/verified.html`);
  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).send('Server error during verification.');
  }
});

// --- POST /auth/logout ---
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  res.json({ message: 'Logged out successfully' });
});
//
// === POST /auth/register ===
//
router.post('/register', async (req, res) => {
  const { email, password, name, role = 'user', business_id } = req.body;

  if (!email || !password || password.length < 8 || !name || !business_id) {
    return res.status(400).json({ error: 'Missing or invalid fields.' });
  }

  try {
    // Check if already exists
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND is_deleted = 0',
      [email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already in use.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const verification_token = crypto.randomUUID();

    await pool.query(
      `INSERT INTO users (email, password_hash, name, role, business_id, verification_token)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [email, password_hash, name, role, business_id, verification_token]
    );

    await sendVerificationEmail(email, verification_token);

    res.status(201).json({ message: 'Account created. Please check your email to verify.' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

module.exports = router;
