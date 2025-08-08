const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
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

// Send email
async function sendVerificationEmail(email, token) {
  const url = `https://${process.env.APP_DOMAIN}/auth/verify?token=${token}`;
  const html = `
    <p>Welcome to Tidyzenic!</p>
    <p>Please verify your email by clicking the link below:</p>
    <a href="${url}">${url}</a>
    <p>This link expires in 24 hours.</p>
  `;
  return transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Verify Your Email Address',
    html,
  });
}

// POST /register
router.post('/', async (req, res) => {
  const {
    businessName, email, phone, subdomain,
    password, location, ownerName, vatNumber,
    preferred_language, custom_domain
  } = req.body;

  if (
    !businessName?.trim() || !email?.trim() || !subdomain?.trim() ||
    !password?.trim() || !location?.trim() || !ownerName?.trim() || !preferred_language
  ) {
    return res.status(400).json({ error: '❌ Please fill in all required fields.' });
  }

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    const [businesses] = await pool.query('SELECT * FROM businesses WHERE email = ?', [email]);

    const existingUser = users[0];
    const existingBusiness = businesses[0];

    if (existingUser && existingUser.is_deleted) {
      const hashed = await bcrypt.hash(password, 10);
      const token = crypto.randomUUID();
      await pool.query(`UPDATE users SET is_deleted=0, password_hash=?, is_verified=0, verification_token=? WHERE id=?`, [hashed, token, existingUser.id]);
      await pool.query(`UPDATE businesses SET is_deleted=0 WHERE id=?`, [existingUser.business_id]);
      await sendVerificationEmail(email, token);
      return res.status(200).json({ message: `✅ Account reactivated. Please check your email to verify.`, redirectTo: '/login.html' });
    }

    if (existingUser) {
      return res.status(400).json({ error: '❌ Email already exists. <a href="/login.html" class="text-blue-600 underline">Login?</a>' });
    }

    if (existingBusiness && !existingUser) {
      const hashed = await bcrypt.hash(password, 10);
      const token = crypto.randomUUID();
      await pool.query(`INSERT INTO users (business_id, email, password_hash, role, is_verified, verification_token) VALUES (?, ?, ?, 'admin', 0, ?)`, [existingBusiness.id, email, hashed, token]);
      await sendVerificationEmail(email, token);
      return res.status(200).json({ message: `✅ User account restored. Please check your email to verify.`, redirectTo: '/login.html' });
    }

    const [subdomainCheck] = await pool.query('SELECT id FROM businesses WHERE subdomain = ? AND is_deleted = 0', [subdomain]);
    if (subdomainCheck.length > 0) {
      return res.status(400).json({ error: '❌ Subdomain is already taken. Please choose another.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const token = crypto.randomUUID();

    const [businessRes] = await pool.query(`
      INSERT INTO businesses (business_name, email, phone, subdomain, location, vat_number, owner_name, password_hash, preferred_language, custom_domain)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [businessName, email, phone || null, subdomain, location, vatNumber || null, ownerName, hashedPassword, preferred_language, custom_domain || null]
    );

    const businessId = businessRes.insertId;

    await pool.query(`INSERT INTO users (business_id, email, password_hash, role, is_verified, verification_token) VALUES (?, ?, ?, 'admin', 0, ?)`,
      [businessId, email, hashedPassword, token]);

    await sendVerificationEmail(email, token);

    res.status(200).json({
      message: `✅ Registration successful. A verification email has been sent to ${email}.`,
      redirectTo: '/login.html'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '❌ Server error. Try again later.' });
  }
});

// Subdomain availability
router.post('/check-subdomain', async (req, res) => {
  const { subdomain } = req.body;
  if (!subdomain) return res.status(400).json({ error: '❌ Subdomain is required.' });

  try {
    const [rows] = await pool.query('SELECT id FROM businesses WHERE subdomain = ?', [subdomain]);
    res.json({ exists: rows.length > 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '❌ Subdomain check failed.' });
  }
});

module.exports = router;
