const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db');
const transporter = require('../utils/mailer');

const router = express.Router();

// === Utility functions ===
function generateJWT(payload, expiresIn = '1d') {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

function buildResetLink(token) {
  return `https://${process.env.APP_DOMAIN}/reset-password.html?token=${token}`;
}

function buildVerificationLink(token) {
  return `https://${process.env.APP_DOMAIN}/auth/verify?token=${token}`;
}

async function sendResetEmail(email, token) {
  const link = buildResetLink(token);
  return transporter.sendMail({
    from: `"Tidyzenic Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Password Reset Instructions',
    html: `
      <p>Hello,</p>
      <p>You requested a password reset. Click the link below to set a new password:</p>
      <p><a href="${link}">${link}</a></p>
      <p>This link is valid for 30 minutes. If you didn’t request it, just ignore this email.</p>
    `
  });
}

async function sendVerificationEmail(email, token) {
  const link = buildVerificationLink(token);
  return transporter.sendMail({
    from: `"Tidyzenic Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify Your Tidyzenic Account',
    html: `
      <p>Welcome to Tidyzenic!</p>
      <p>Click below to verify your email:</p>
      <p><a href="${link}">${link}</a></p>
    `
  });
}

// === POST /auth/login ===
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required.' });

  try {
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND is_deleted = 0',
      [email]
    );

    if (users.length === 0)
      return res.status(401).json({ error: 'Invalid credentials.' });

    const user = users[0];

    if (!user.is_verified)
      return res.status(403).json({ error: 'Please verify your account first.' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      return res.status(401).json({ error: 'Invalid credentials.' });

    const token = generateJWT({
      id: user.id,
      email: user.email,
      role: user.role,
      business_id: user.business_id
    });

    res.status(200).json({ message: 'Login successful', token, role: user.role });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// === POST /auth/forgot-password ===
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  try {
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND is_deleted = 0',
      [email]
    );

    if (users.length === 0) {
      const [biz] = await pool.query('SELECT id FROM businesses WHERE email = ?', [email]);
      if (biz.length > 0) {
        return res.status(400).json({
          error: 'This email is linked to a business but not a user. Please register again or contact support.'
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

    res.status(200).json({ message: 'Password reset email sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// === POST /auth/reset-password ===
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || newPassword.length < 8)
    return res.status(400).json({ error: 'Invalid or weak password.' });

  try {
    const [users] = await pool.query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()',
      [token]
    );

    if (users.length === 0)
      return res.status(400).json({ error: 'Invalid or expired token.' });

    const hashed = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
      [hashed, users[0].id]
    );

    res.status(200).json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Reset error:', err);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// === POST /auth/resend-verification ===
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  try {
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND is_verified = 0 AND is_deleted = 0',
      [email]
    );

    if (users.length === 0)
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

    res.status(200).json({ message: 'Verification email sent.' });
  } catch (err) {
    console.error('Resend verification error:', err);
    res.status(500).json({ error: 'Server error. Please try again later.' });
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

    if (users.length === 0)
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

module.exports = router;
