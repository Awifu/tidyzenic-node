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

// === Email Templates (Multilingual) ===
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
  fr: {
    subject: 'Vérifiez votre adresse e-mail',
    body: (url) => `
      <p>Bienvenue chez Tidyzenic !</p>
      <p>Veuillez vérifier votre adresse e-mail en cliquant ci-dessous :</p>
      <a href="${url}">${url}</a>
      <p>Ce lien expire dans 24 heures.</p>
    `
  },
  de: {
    subject: 'Bestätigen Sie Ihre E-Mail-Adresse',
    body: (url) => `
      <p>Willkommen bei Tidyzenic!</p>
      <p>Bitte bestätigen Sie Ihre E-Mail-Adresse durch Klicken auf den folgenden Link:</p>
      <a href="${url}">${url}</a>
      <p>Dieser Link läuft in 24 Stunden ab.</p>
    `
  },
  nl: {
    subject: 'Bevestig uw e-mailadres',
    body: (url) => `
      <p>Welkom bij Tidyzenic!</p>
      <p>Bevestig uw e-mailadres via de onderstaande link:</p>
      <a href="${url}">${url}</a>
      <p>Deze link verloopt over 24 uur.</p>
    `
  },
  es: {
    subject: 'Verifica tu dirección de correo electrónico',
    body: (url) => `
      <p>¡Bienvenido a Tidyzenic!</p>
      <p>Por favor verifica tu correo electrónico haciendo clic en el siguiente enlace:</p>
      <a href="${url}">${url}</a>
      <p>Este enlace expirará en 24 horas.</p>
    `
  },
  pt: {
    subject: 'Verifique seu endereço de e-mail',
    body: (url) => `
      <p>Bem-vindo ao Tidyzenic!</p>
      <p>Por favor, verifique seu e-mail clicando no link abaixo:</p>
      <a href="${url}">${url}</a>
      <p>Este link expirará em 24 horas.</p>
    `
  },
  da: {
    subject: 'Bekræft din e-mailadresse',
    body: (url) => `
      <p>Velkommen til Tidyzenic!</p>
      <p>Bekræft venligst din e-mail ved at klikke på linket nedenfor:</p>
      <a href="${url}">${url}</a>
      <p>Dette link udløber om 24 timer.</p>
    `
  }
};


// === Send Verification Email with Language Support ===
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

// === Helper: Normalize Optional Fields ===
const normalize = (val) => {
  if (typeof val !== 'string') return val;
  const trimmed = val.trim();
  return trimmed === '' ? null : trimmed;
};

// === POST /register ===
router.post('/', async (req, res) => {
  const {
    businessName,
    email,
    phone,
    subdomain,
    password,
    location,
    ownerName,
    vatNumber,
    preferred_language,
    'g-recaptcha-response': recaptchaToken // optional
  } = req.body;

  // ✅ Basic Validation
  if (
    !businessName?.trim() || !email?.trim() || !subdomain?.trim() ||
    !password?.trim() || !location?.trim() || !ownerName?.trim() || !preferred_language
  ) {
    return res.status(400).json({ error: '❌ Please fill in all required fields.' });
  }

  // ✅ Normalize Inputs
  const business_name = businessName.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedSubdomain = subdomain.trim().toLowerCase();
  const normalizedPassword = password.trim();
  const normalizedLocation = normalize(location);
  const normalizedPhone = normalize(phone);
  const normalizedVAT = normalize(vatNumber);
  const normalizedOwner = normalize(ownerName);
  const normalizedLang = preferred_language;

  try {
    // === Optional: Validate reCAPTCHA (future-proofed)
    // Skipped here, but you could verify it with Google if needed.

    // === Existing user check
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    const [businesses] = await pool.query('SELECT * FROM businesses WHERE email = ?', [normalizedEmail]);

    const existingUser = users[0] || null;
    const existingBusiness = businesses[0] || null;

    // === Reactivate deleted user
    if (existingUser && existingUser.is_deleted) {
      const hashed = await bcrypt.hash(normalizedPassword, 10);
      const token = crypto.randomUUID();

      await pool.query(
        'UPDATE users SET is_deleted = 0, password_hash = ?, is_verified = 0, verification_token = ? WHERE id = ?',
        [hashed, token, existingUser.id]
      );

      if (existingUser.business_id) {
        await pool.query('UPDATE businesses SET is_deleted = 0 WHERE id = ?', [existingUser.business_id]);
      }

      await sendVerificationEmail(normalizedEmail, token, normalizedLang);

      return res.status(200).json({
        message: '✅ Account reactivated. Please check your email to verify.',
        redirectTo: '/login.html'
      });
    }

    // === Email already in use
    if (existingUser) {
      return res.status(400).json({
        error: '❌ This email is already registered.',
        action: { text: 'Login', href: '/login.html' }
      });
    }

    // === Orphaned business
    if (existingBusiness && !existingUser) {
      const hashed = await bcrypt.hash(normalizedPassword, 10);
      const token = crypto.randomUUID();

      await pool.query(
        'INSERT INTO users (business_id, email, password_hash, role, is_verified, verification_token) VALUES (?, ?, ?, "admin", 0, ?)',
        [existingBusiness.id, normalizedEmail, hashed, token]
      );

      await sendVerificationEmail(normalizedEmail, token, normalizedLang);

      return res.status(200).json({
        message: '✅ User account restored. Please check your email to verify.',
        redirectTo: '/login.html'
      });
    }

    // === Subdomain already taken
    const [subdomainCheck] = await pool.query(
      'SELECT id FROM businesses WHERE subdomain = ? AND is_deleted = 0',
      [normalizedSubdomain]
    );

    if (subdomainCheck.length > 0) {
      return res.status(400).json({ error: '❌ Subdomain is already taken. Please choose another.' });
    }

    // === Create business
    const hashedPassword = await bcrypt.hash(normalizedPassword, 10);
    const token = crypto.randomUUID();

    const [businessResult] = await pool.query(
      `INSERT INTO businesses (
        business_name, email, phone, subdomain, location, vat_number,
        owner_name, password_hash, preferred_language
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        business_name,
        normalizedEmail,
        normalizedPhone,
        normalizedSubdomain,
        normalizedLocation,
        normalizedVAT,
        normalizedOwner,
        hashedPassword,
        normalizedLang
      ]
    );

    const businessId = businessResult.insertId;

    // === Create admin user
    await pool.query(
      'INSERT INTO users (business_id, email, password_hash, role, is_verified, verification_token) VALUES (?, ?, ?, "admin", 0, ?)',
      [businessId, normalizedEmail, hashedPassword, token]
    );

    // === Send verification email
    await sendVerificationEmail(normalizedEmail, token, normalizedLang);

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
