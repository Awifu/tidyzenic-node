// controllers/smsController.js

const db = require('../db');
const twilio = require('twilio');

/**
 * Save Twilio SMS settings for a business after validating the credentials.
 */
exports.saveTwilioSettings = async (req, res) => {
  const { business_id, sid, token, phone } = req.body;

  // Basic validation
  if (!business_id || !sid || !token || !phone) {
    return res.status(400).json({ error: 'All fields (SID, token, phone) are required.' });
  }

  try {
    // ✅ Validate Twilio credentials
    const client = twilio(sid, token);
    await client.api.accounts(sid).fetch();

    // ✅ Save to DB
    await db.execute(
      `
        INSERT INTO sms_settings (business_id, twilio_sid, twilio_auth_token, twilio_phone)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          twilio_sid = VALUES(twilio_sid),
          twilio_auth_token = VALUES(twilio_auth_token),
          twilio_phone = VALUES(twilio_phone),
          updated_at = CURRENT_TIMESTAMP
      `,
      [business_id, sid, token, phone]
    );

    return res.status(200).json({ success: true, message: '✅ Twilio settings validated and saved.' });

  } catch (error) {
    console.error('❌ Invalid Twilio credentials:', error.message);
    return res.status(400).json({ error: 'Invalid Twilio credentials. Please double-check and try again.' });
  }
};
