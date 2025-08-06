const express = require('express');
const router = express.Router();
const db = require('../db');
const { sendMail } = require('../utils/mailer');
const { sendSMS } = require('../utils/sms');
const analyticsController = require('../controllers/analyticsController');

// ============================
// GET: Review settings
// ============================
router.get('/settings/:business_id', async (req, res) => {
  try {
    const { business_id } = req.params;
    const [rows] = await db.execute(`SELECT * FROM review_settings WHERE business_id = ?`, [business_id]);
    res.json({ settings: rows[0] || null });
  } catch (err) {
    console.error('❌ Failed to fetch review settings:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// ============================
// POST: Save (upsert) review settings
// ============================
router.post('/settings', async (req, res) => {
  const {
    business_id,
    google_review_link = '',
    enable_google,
    enable_internal,
    delay_minutes,
    send_email,
    send_sms
  } = req.body;

  if (!business_id) return res.status(400).json({ error: 'Business ID is required' });

  const trimmedLink = google_review_link.trim();
  const validGoogleLink = trimmedLink === '' || /^https:\/\/(g\.page|search\.google\.com|www\.google\.com)\/.+/.test(trimmedLink);
  if (!validGoogleLink) return res.status(400).json({ error: 'Invalid Google Review link' });

  try {
    await db.execute(`
      INSERT INTO review_settings (
        business_id, google_review_link, enable_google, enable_internal, delay_minutes, send_email, send_sms
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        google_review_link = VALUES(google_review_link),
        enable_google = VALUES(enable_google),
        enable_internal = VALUES(enable_internal),
        delay_minutes = VALUES(delay_minutes),
        send_email = VALUES(send_email),
        send_sms = VALUES(send_sms),
        updated_at = CURRENT_TIMESTAMP`,
      [business_id, trimmedLink, enable_google, enable_internal, delay_minutes, send_email, send_sms]
    );

    res.json({ success: true, message: 'Review settings saved' });
  } catch (err) {
    console.error('❌ Failed to save review settings:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// ============================
// POST: Submit internal review
// ============================
router.post('/submit', async (req, res) => {
  const { ticket_id, rating, comment } = req.body;
  if (!ticket_id || !rating) return res.status(400).json({ error: 'Ticket ID and rating are required' });

  try {
    await db.execute(
      `INSERT INTO internal_reviews (ticket_id, rating, comment, created_at) VALUES (?, ?, ?, NOW())`,
      [ticket_id, rating, comment || null]
    );

    res.json({ success: true, message: 'Review submitted successfully' });
  } catch (err) {
    console.error('❌ Failed to submit internal review:', err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// ============================
// GET: Internal reviews
// ============================
router.get('/internal/:business_id', async (req, res) => {
  try {
    const { business_id } = req.params;
    const [reviews] = await db.execute(
      `SELECT ticket_id, rating, comment, created_at
       FROM internal_reviews
       WHERE ticket_id IN (
         SELECT id FROM support_tickets WHERE business_id = ?
       )
       ORDER BY created_at DESC`,
      [business_id]
    );
    res.json({ reviews });
  } catch (err) {
    console.error('❌ Failed to fetch internal reviews:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// ============================
// POST: Send Internal Review Request (email)
// ============================
router.post('/internal/send/:businessId', async (req, res) => {
  const { businessId } = req.params;

  try {
    const [[settings]] = await db.execute(`SELECT enable_internal FROM review_settings WHERE business_id = ?`, [businessId]);
    if (!settings?.enable_internal) return res.status(400).json({ error: 'Internal reviews are disabled' });

    const [clients] = await db.execute(
      `SELECT u.email, u.name, t.id AS ticket_id
       FROM users u
       JOIN support_tickets t ON u.id = t.user_id
       WHERE u.business_id = ?
         AND u.role = 'client'
         AND u.is_verified = 1
         AND u.is_deleted = 0
         AND u.email IS NOT NULL
         AND (t.review_sent IS NULL OR t.review_sent = 0)
       ORDER BY t.created_at DESC`,
      [businessId]
    );

    if (!clients.length) return res.status(404).json({ error: 'No eligible clients found' });

    const [[biz]] = await db.execute(`SELECT business_name FROM businesses WHERE id = ?`, [businessId]);

    for (const { email, name, ticket_id } of clients) {
      const reviewLink = `https://${process.env.APP_DOMAIN}/review-internal?t=${ticket_id}`;
      await sendMail({
        to: email,
        subject: `We’d love your feedback – ${biz.business_name}`,
        html: `
          <p>Hello ${name || 'there'},</p>
          <p>We’d appreciate your feedback on your recent experience:</p>
          <p><a href="${reviewLink}" target="_blank">${reviewLink}</a></p>
          <p>Thanks for your time!</p>
        `,
      });

      await db.execute(`UPDATE support_tickets SET review_sent = 1 WHERE id = ?`, [ticket_id]);
    }

    res.json({ success: true, message: `Sent to ${clients.length} client(s)` });
  } catch (err) {
    console.error('❌ Failed to send internal review requests:', err);
    res.status(500).json({ error: 'Internal review request failed' });
  }
});

// ============================
// POST: Send Google Review via Email
// ============================
router.post('/google/send/:businessId', async (req, res) => {
  const { businessId } = req.params;

  try {
    const [[settings]] = await db.execute(`SELECT google_review_link FROM review_settings WHERE business_id = ?`, [businessId]);
    if (!settings?.google_review_link) return res.status(400).json({ error: 'Google review link not configured' });

    const [clients] = await db.execute(
      `SELECT DISTINCT email FROM users WHERE business_id = ? AND email IS NOT NULL AND is_verified = 1 AND is_deleted = 0`,
      [businessId]
    );

    if (!clients.length) return res.status(404).json({ error: 'No eligible clients found' });

    for (const { email } of clients) {
      await sendMail({
        to: email,
        subject: 'We’d love your feedback!',
        html: `
          <p>Hello,</p>
          <p>Please leave us a quick review:</p>
          <p><a href="${settings.google_review_link}" target="_blank">${settings.google_review_link}</a></p>
          <p>Thanks! 🙏</p>
        `,
      });
    }

    res.json({ success: true, message: `Sent to ${clients.length} client(s)` });
  } catch (err) {
    console.error('❌ Failed to send Google review emails:', err);
    res.status(500).json({ error: 'Failed to send review emails' });
  }
});

// ============================
// POST: Send Google Review via SMS
// ============================
router.post('/google/send-sms/:businessId', async (req, res) => {
  const { businessId } = req.params;

  try {
    const [[settings]] = await db.execute(`SELECT google_review_link FROM review_settings WHERE business_id = ?`, [businessId]);
    if (!settings?.google_review_link) return res.status(400).json({ error: 'Google review link not configured' });

    const [[biz]] = await db.execute(
      `SELECT twilio_sid, twilio_auth_token, twilio_phone_number FROM businesses WHERE id = ?`,
      [businessId]
    );

    if (!biz?.twilio_sid || !biz?.twilio_auth_token || !biz?.twilio_phone_number) {
      return res.status(400).json({ error: 'Missing Twilio credentials' });
    }

    const [users] = await db.execute(
      `SELECT phone FROM users WHERE business_id = ? AND phone IS NOT NULL AND is_verified = 1`,
      [businessId]
    );

    if (!users.length) return res.status(404).json({ error: 'No verified users with phone numbers' });

    let sentCount = 0;
    for (const { phone } of users) {
      try {
        await sendSMS({
          sid: biz.twilio_sid,
          authToken: biz.twilio_auth_token,
          from: biz.twilio_phone_number,
          to: phone,
          message: `Hi! Please review us: ${settings.google_review_link}`,
        });
        sentCount++;
      } catch (err) {
        console.warn(`⚠️ SMS failed for ${phone}:`, err.message);
      }
    }

    res.json({ success: true, message: `SMS sent to ${sentCount} user(s)` });
  } catch (err) {
    console.error('❌ Failed to send SMS reviews:', err);
    res.status(500).json({ error: 'Failed to send SMS reviews' });
  }
});

// ============================
// GET: Analytics routes
// ============================
router.get('/google/analytics/:businessId', analyticsController.googleAnalytics);
router.get('/internal/analytics/:businessId', analyticsController.internalAnalytics);

module.exports = router;
