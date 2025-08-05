// routes/reviews.js

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

    return res.json({ settings: rows[0] || null });
  } catch (err) {
    console.error('❌ Error fetching review settings:', err);
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// ============================
// POST: Save or update review settings
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

  try {
    await db.execute(
      `INSERT INTO review_settings (
        business_id,
        google_review_link,
        enable_google,
        enable_internal,
        delay_minutes,
        send_email,
        send_sms
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
        google_review_link || '',
        !!enable_google,
        !!enable_internal,
        delay_minutes || 0,
        !!send_email,
        !!send_sms
      ]
    );

    return res.json({ success: true, message: 'Review settings saved successfully' });
  } catch (err) {
    console.error('❌ Error saving review settings:', err);
    return res.status(500).json({ error: 'Failed to save settings' });
  }
});

// ============================
// POST: Submit internal review
// ============================
router.post('/submit', async (req, res) => {
  const { ticket_id, rating, comment } = req.body;

  if (!ticket_id || rating == null) {
    return res.status(400).json({ error: 'Ticket ID and rating are required' });
  }

  try {
    await db.execute(
      `INSERT INTO internal_reviews (ticket_id, rating, comment, created_at)
       VALUES (?, ?, ?, NOW())`,
      [ticket_id, rating, comment || null]
    );

    return res.json({ success: true, message: 'Review submitted successfully' });
  } catch (err) {
    console.error('❌ Error submitting internal review:', err);
    return res.status(500).json({ error: 'Failed to submit review' });
  }
});

// ============================
// GET: Internal reviews by business
// ============================
router.get('/internal/:business_id', async (req, res) => {
  const { business_id } = req.params;

  try {
    const [reviews] = await db.execute(
      `SELECT ir.ticket_id, ir.rating, ir.comment, ir.created_at
       FROM internal_reviews ir
       JOIN support_tickets t ON ir.ticket_id = t.id
       WHERE t.business_id = ?
       ORDER BY ir.created_at DESC`,
      [business_id]
    );

    return res.json({ reviews });
  } catch (err) {
    console.error('❌ Error fetching internal reviews:', err);
    return res.status(500).json({ error: 'Failed to fetch internal reviews' });
  }
});

module.exports = router;
