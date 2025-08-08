const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const pool = require('../db');

// === Email Transporter ===
const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// === Email Templates ===
const emailTemplates = {
  en: {
    subject: 'Verify Your Email Address',
    body: (url) => `
      <p>Welcome to Tidyzenic!</p>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${url}">${url}</a>
      <p>This link expires in 24 hours.</p>
    `
  },
  // ...other languages...
};

// === Send Verification Email ===
async function sendVerificationEmail(email, token, lang = 'en') {
  const url = `https://${process.env.APP_DOMAIN}/auth/verify?token=${token}`;
  const template = emailTemplates[lang] || emailTemplates['en'];
  return transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: template.subject,
    html: template.body(url),
  });
}

// === Normalize Helper ===
const normalize = (val) => {
  if (typeof val !== 'string') return val;
  const trimmed = val.trim();
  return trimmed === '' ? null : trimmed;
};

// === POST /register ===
router.post('/', async (req, res) => {
  const {
    business_name,
    email,
    phone,
    subdomain,
    password,
    location,
    owner_name,
    vat_number,
    preferred_language,
    plan,
    'g-recaptcha-response': recaptchaToken
  } = req.body;

  if (
    !business_name?.trim() || !email?.trim() || !subdomain?.trim() ||
    !password?.trim() || !location?.trim() || !owner_name?.trim() || !preferred_language
  ) {
    return res.status(400).json({ error: '❌ Please fill in all required fields.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedSubdomain = subdomain.trim().toLowerCase();

  try {
    // Check subdomain availability
    const [subdomainCheck] = await pool.query(
      'SELECT id FROM businesses WHERE subdomain = ? AND is_deleted = 0',
      [normalizedSubdomain]
    );
    if (subdomainCheck.length > 0) {
      return res.status(400).json({ error: '❌ Subdomain is already taken.' });
    }

    // Check if email already exists
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: '❌ This email is already registered.' });
    }

    // Get Plan ID
    const planQuery = plan
      ? 'SELECT id FROM plans WHERE slug = ? LIMIT 1'
      : 'SELECT id FROM plans WHERE is_trial = 1 LIMIT 1';

    const [planRows] = await pool.query(planQuery, plan ? [plan] : []);
    if (!planRows.length) {
      return res.status(400).json({ error: '❌ Plan not found.' });
    }
    const selectedPlanId = planRows[0].id;

    // Create Business + User
    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date();
    const trialEnds = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const [businessInsert] = await pool.query(
      `INSERT INTO businesses (
        business_name, email, phone, subdomain, location,
        vat_number, owner_name, password_hash, preferred_language,
        plan_id, trial_started_at, trial_ends_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        business_name, normalizedEmail, phone, normalizedSubdomain, location,
        normalize(vat_number), owner_name, hashedPassword, preferred_language,
        selectedPlanId, now, trialEnds
      ]
    );

    const businessId = businessInsert.insertId;

    const token = crypto.randomUUID();

    await pool.query(
      `INSERT INTO users (business_id, email, password_hash, role, is_verified, verification_token)
       VALUES (?, ?, ?, "admin", 0, ?)`,
      [businessId, normalizedEmail, hashedPassword, token]
    );

    await sendVerificationEmail(normalizedEmail, token, preferred_language);

    return res.status(200).json({
      success: true,
      email: normalizedEmail,
      message: `✅ Registration successful. A verification email has been sent to ${normalizedEmail}.`,
      redirectTo: '/login.html'
    });

  } catch (err) {
    console.error('❌ Registration error:', err);
    return res.status(500).json({ error: '❌ Server error. Please try again later.' });
  }
});

// === GET /register/check-subdomain ===
router.get('/check-subdomain', async (req, res) => {
  const { subdomain } = req.query;

  if (!subdomain) {
    return res.status(400).json({ error: '❌ Subdomain is required.' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id FROM businesses WHERE subdomain = ? AND is_deleted = 0',
      [subdomain.trim().toLowerCase()]
    );

    return res.json({ exists: rows.length > 0 });
  } catch (err) {
    console.error('❌ Subdomain check error:', err);
    return res.status(500).json({ error: '❌ Could not check subdomain availability.' });
  }
});

module.exports = router;
