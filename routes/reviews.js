const express = require('express');
const router = express.Router();
const db = require('../db');

// ============================
// GET review settings for business
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
// POST/PUT review settings (upsert)
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
        updated_at = CURRENT_TIMESTAMP
    `, [
      business_id,
      google_review_link,
      enable_google,
      enable_internal,
      delay_minutes,
      send_email,
      send_sms,
    ]);

    res.json({ success: true, message: 'Review settings saved' });
  } catch (err) {
    console.error('❌ Failed to save review settings:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// ============================
// POST submit internal review
// ============================
router.post('/submit', async (req, res) => {
  const { ticket_id, business_id, rating, message } = req.body;

  if (!ticket_id || !business_id || !rating) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await db.execute(
      `INSERT INTO internal_reviews (ticket_id, business_id, rating, message)
       VALUES (?, ?, ?, ?)`,
      [ticket_id, business_id, rating, message]
    );

    res.status(201).json({ success: true, message: 'Review submitted' });
  } catch (err) {
    console.error('❌ Failed to submit review:', err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});
// POST: Handle internal review submission
router.post('/submit', async (req, res) => {
  const { ticket_id, rating, comment } = req.body;

  if (!ticket_id || !rating) {
    return res.status(400).json({ error: 'Missing ticket ID or rating' });
  }

  try {
    await db.execute(`
      INSERT INTO internal_reviews (ticket_id, rating, comment, created_at)
      VALUES (?, ?, ?, NOW())
    `, [ticket_id, rating, comment || null]);

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error submitting internal review:', err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

module.exports = router;
