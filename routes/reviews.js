const express = require('express');
const router = express.Router();
const db = require('../db');
const { sendMail } = require('../utils/mailer');
const analyticsController = require('../controllers/analyticsController');

// ============================
// GET: Review settings for a business
// ============================
router.get('/settings/:business_id', async (req, res) => {
  const { business_id } = req.params;

  try {
    const [rows] = await db.execute(
      `SELECT * FROM review_settings WHERE business_id = ?`,
      [business_id]
    );

    res.json({ settings: rows[0] || null });
  } catch (err) {
    console.error('❌ Failed to get review settings:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// ============================
// POST: Save (upsert) review settings
// ============================
router.post('/settings', async (req, res) => {
  const {
    business_id,
    google_review_link,
    enable_google,
    enable_internal,
    delay_minutes,
    send_email,
    send_sms,
  } = req.body;

  if (!business_id) {
    return res.status(400).json({ error: 'Business ID is required' });
  }

  const trimmedLink = (google_review_link || '').trim();
  const validGoogleLink =
    trimmedLink === '' || /^https:\/\/(g\.page|search\.google\.com|www\.google\.com)\/.+/.test(trimmedLink);

  if (!validGoogleLink) {
    return res.status(400).json({ error: 'Invalid Google Review link' });
  }

  try {
    await db.execute(
      `INSERT INTO review_settings (
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
      [
        business_id,
        trimmedLink,
        enable_google,
        enable_internal,
        delay_minutes,
        send_email,
        send_sms,
      ]
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

  if (!ticket_id || !rating) {
    return res.status(400).json({ error: 'Missing ticket ID or rating' });
  }

  try {
    await db.execute(
      `INSERT INTO internal_reviews (ticket_id, rating, comment, created_at)
       VALUES (?, ?, ?, NOW())`,
      [ticket_id, rating, comment || null]
    );

    res.json({ success: true, message: 'Review submitted successfully' });
  } catch (err) {
    console.error('❌ Failed to submit internal review:', err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// ============================
// GET: Internal reviews by business
// ============================
router.get('/internal/:business_id', async (req, res) => {
  const { business_id } = req.params;

  try {
    const [rows] = await db.execute(
      `SELECT ticket_id, rating, comment, created_at
       FROM internal_reviews
       WHERE ticket_id IN (
         SELECT id FROM support_tickets WHERE business_id = ?
       )
       ORDER BY created_at DESC`,
      [business_id]
    );

    res.json({ reviews: rows });
  } catch (err) {
    console.error('❌ Failed to fetch internal reviews:', err);
    res.status(500).json({ error: 'Failed to fetch internal reviews' });
  }
});

// ============================
// GET: Google review analytics
// ============================
router.get('/google/analytics/:businessId', analyticsController.googleAnalytics);

// ============================
// GET: Internal review analytics
// ============================
router.get('/internal/analytics/:businessId', analyticsController.internalAnalytics);

// ============================
// POST: Send Google review request via email
// ============================
router.post('/google/send/:businessId', async (req, res) => {
  const { businessId } = req.params;

  try {
    // Get review link
    const [[settings]] = await db.execute(
      `SELECT google_review_link FROM review_settings WHERE business_id = ?`,
      [businessId]
    );

    if (!settings?.google_review_link) {
      return res.status(400).json({ error: 'No Google review link configured for this business' });
    }

    // Get client emails from latest tickets
    const [clients] = await db.execute(
      `SELECT email FROM support_tickets WHERE business_id = ? AND email IS NOT NULL`,
      [businessId]
    );

    if (!clients.length) {
      return res.status(404).json({ error: 'No client emails found' });
    }

    // Send to all clients
    for (const { email } of clients) {
      await sendMail({
        to: email,
        subject: 'We value your feedback!',
        html: `
          <p>Hello,</p>
          <p>We’d really appreciate it if you could leave us a quick Google review.</p>
          <p><a href="${settings.google_review_link}" target="_blank">${settings.google_review_link}</a></p>
          <p>Thank you! 🙏</p>
        `,
      });
    }

    res.json({ success: true, message: `Sent review request to ${clients.length} client(s)` });
  } catch (err) {
    console.error('❌ Failed to send Google review emails:', err);
    res.status(500).json({ error: 'Failed to send review emails' });
  }
});

// ✅ Export router
module.exports = router;
