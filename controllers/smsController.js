// controllers/smsController.js

const db = require('../db');
const twilio = require('twilio');
const { encrypt } = require('../utils/encryption'); // Import encryption

exports.saveTwilioSettings = async (req, res) => {
  const { business_id, twilio_sid, twilio_auth_token, twilio_phone } = req.body;

  if (!business_id || !twilio_sid || !twilio_auth_token || !twilio_phone) {
    return res.status(400).json({ error: 'All fields (SID, token, phone) are required.' });
  }

  try {
    // Validate credentials
    const client = twilio(twilio_sid, twilio_auth_token);
    await client.api.accounts(twilio_sid).fetch();

    // Encrypt token
    const encryptedToken = encrypt(twilio_auth_token);

    // Save to DB
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
      [business_id, twilio_sid, encryptedToken, twilio_phone]
    );

    return res.status(200).json({ success: true, message: '✅ Twilio settings validated and saved.' });

  } catch (error) {
    console.error('❌ Invalid Twilio credentials:', error.message);
    return res.status(400).json({ error: 'Invalid Twilio credentials. Please double-check and try again.' });
  }
};
