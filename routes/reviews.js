const express = require('express');
const router = express.Router();
const db = require('../db');

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

    if (rows.length === 0) {
      return res.json({ settings: null });
    }

    res.json({ settings: rows[0] });
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

  // 🔒 Validate required fields
  if (!business_id) {
    return res.status(400).json({ error: 'Business ID is required' });
  }

  // 🔒 Validate Google review link if provided
  const trimmedLink = (google_review_link || '').trim();
  if (
    trimmedLink &&
    !/^https:\/\/(g\.page|search\.google\.com|www\.google\.com)\/.+/.test(trimmedLink)
  ) {
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

module.exports = router;
