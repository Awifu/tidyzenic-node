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
