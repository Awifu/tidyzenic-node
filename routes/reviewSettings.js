const express = require('express');
const router = express.Router();
const db = require('../db');
const axios = require('axios');

async function validateGoogleLink(url) {
  // Very basic validation: check it's a Google review link
  if (!url.includes('g.page') && !url.includes('google.com')) {
    throw new Error('Invalid Google link format.');
  }
  // Optionally verify via Google Business API or Places API
  return true;
}

router.post('/', async (req, res) => {
  const { business_id, google_review_link, enable_internal, enable_google, delay_hours } = req.body;

  if (enable_google && google_review_link) {
    try {
      await validateGoogleLink(google_review_link);
    } catch (err) {
      return res.status(400).json({ error: 'Google review link not recognized or invalid.' });
    }
  }

  const delay_minutes = parseInt(delay_hours, 10) * 60;

  try {
    const [existing] = await db.execute('SELECT id FROM review_settings WHERE business_id = ?', [business_id]);

    if (existing.length > 0) {
      await db.execute(`UPDATE review_settings
        SET google_review_link=?, enable_internal=?, enable_google=?, delay_minutes=?, updated_at=NOW()
        WHERE business_id=?`, [google_review_link, enable_internal ? 1 : 0, enable_google ? 1 : 0, delay_minutes, business_id]);
    } else {
      await db.execute(`INSERT INTO review_settings
        (business_id, google_review_link, enable_internal, enable_google, delay_minutes, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())`, [business_id, google_review_link, enable_internal ? 1 : 0, enable_google ? 1 : 0, delay_minutes]);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error saving review settings:', err);
    res.status(500).json({ error: 'Failed to store review settings.' });
  }
});

module.exports = router;
