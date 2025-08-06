const express = require('express');
const router = express.Router();
const db = require('../db');
const { encrypt } = require('../utils/encryption');

router.post('/settings', async (req, res) => {
  const { business_id, twilio_sid, twilio_auth_token, twilio_phone } = req.body;

  if (!business_id || !twilio_sid || !twilio_auth_token || !twilio_phone) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const encryptedSid = encrypt(twilio_sid);
    const encryptedToken = encrypt(twilio_auth_token);

    await db.execute(`
      INSERT INTO sms_settings (business_id, twilio_sid, twilio_auth_token, twilio_phone)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        twilio_sid = VALUES(twilio_sid),
        twilio_auth_token = VALUES(twilio_auth_token),
        twilio_phone = VALUES(twilio_phone),
        updated_at = CURRENT_TIMESTAMP
    `, [business_id, encryptedSid, encryptedToken, twilio_phone]);

    res.json({ success: true, message: 'SMS settings saved securely' });
  } catch (err) {
    console.error('❌ Error saving encrypted SMS settings:', err);
    res.status(500).json({ error: 'Server error while saving encrypted SMS settings' });
  }
});

module.exports = router;
