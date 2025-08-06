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
const { validateTwilioCredentials } = require('../utils/sms');

router.post('/validate', async (req, res) => {
  const { twilio_sid, twilio_auth_token } = req.body;

  if (!twilio_sid || !twilio_auth_token) {
    return res.status(400).json({ error: 'SID and Auth Token are required' });
  }

  try {
    const isValid = await validateTwilioCredentials(twilio_sid, twilio_auth_token);
    if (isValid) {
      return res.json({ valid: true });
    } else {
      return res.status(400).json({ valid: false, error: 'Invalid Twilio credentials' });
    }
  } catch (err) {
    console.error('❌ Twilio validation failed:', err.message);
    return res.status(500).json({ error: 'Error validating Twilio credentials' });
  }
});

module.exports = router;
