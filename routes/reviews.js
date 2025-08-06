const express = require('express');
const router = express.Router();
const db = require('../db');
const { sendMail } = require('../utils/mailer');
const { sendSMS } = require('../utils/sms');

// POST: Submit internal review
router.post('/submit', async (req, res) => {
  const { service_order_id, rating, comment } = req.body;

  if (!service_order_id || !rating) {
    return res.status(400).json({ error: 'Service Order ID and rating are required' });
  }

  try {
    await db.execute(
      `INSERT INTO internal_reviews (ticket_id, rating, message, created_at)
       VALUES (?, ?, ?, NOW())`,
      [service_order_id, rating, comment || null]
    );

    res.json({ success: true, message: 'Review submitted successfully' });
  } catch (err) {
    console.error('❌ Failed to submit internal review:', err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// GET: Internal reviews with client, service provider, and service info
router.get('/internal/:business_id', async (req, res) => {
  const { business_id } = req.params;

  try {
    const [reviews] = await db.execute(
      `SELECT
        r.ticket_id,
        r.rating,
        r.message,
        r.created_at,
        client.name AS client_name,
        sp.name AS service_provider_name,
        s.name AS service_name
      FROM internal_reviews r
      JOIN service_orders o ON r.ticket_id = o.id
      JOIN users client ON o.user_id = client.id
      JOIN users sp ON o.service_provider_id = sp.id
      JOIN services s ON o.service_id = s.id
      WHERE o.business_id = ?
      ORDER BY r.created_at DESC`,
      [business_id]
    );

    res.json({ reviews });
  } catch (err) {
    console.error('❌ Failed to fetch internal reviews:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// GET: Review settings for a business
router.get('/settings/:business_id', async (req, res) => {
  const { business_id } = req.params;

  try {
    const [[settings]] = await db.execute(
      `SELECT * FROM review_settings WHERE business_id = ?`,
      [business_id]
    );

    if (!settings) {
      return res.status(404).json({ error: 'Settings not found' });
    }

    res.json({ settings });
  } catch (err) {
    console.error('❌ Failed to fetch review settings:', err);
    res.status(500).json({ error: 'Failed to fetch review settings' });
  }
});

// POST: Update review settings
router.post('/settings', async (req, res) => {
  const { business_id, enable_internal } = req.body;

  if (!business_id) {
    return res.status(400).json({ error: 'business_id is required' });
  }

  try {
    const [result] = await db.execute(
      `UPDATE review_settings SET enable_internal = ? WHERE business_id = ?`,
      [enable_internal ? 1 : 0, business_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Settings not found for that business' });
    }

    res.json({ success: true, message: 'Review settings updated' });
  } catch (err) {
    console.error('❌ Failed to update review settings:', err);
    res.status(500).json({ error: 'Failed to update review settings' });
  }
});

// POST: Send internal review requests
router.post('/internal/send/:businessId', async (req, res) => {
  const { businessId } = req.params;

  try {
    const [[settings]] = await db.execute(
      `SELECT enable_internal FROM review_settings WHERE business_id = ?`,
      [businessId]
    );

    if (!settings?.enable_internal) {
      return res.status(400).json({ error: 'Internal reviews are disabled' });
    }

    const [orders] = await db.execute(
      `SELECT u.email, u.name, o.id AS service_order_id
       FROM service_orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.business_id = ?
         AND u.role = 'client'
         AND u.is_verified = 1
         AND u.is_deleted = 0
         AND u.email IS NOT NULL
         AND o.status = 'completed'
         AND o.review_sent = 0
       ORDER BY o.completed_at DESC`,
      [businessId]
    );

    if (!orders.length) {
      return res.status(404).json({ error: 'No eligible clients found' });
    }

    const [[biz]] = await db.execute(
      `SELECT business_name FROM businesses WHERE id = ?`,
      [businessId]
    );

    for (const { email, name, service_order_id } of orders) {
      const reviewLink = `https://${process.env.APP_DOMAIN}/review-internal?o=${service_order_id}`;
      await sendMail({
        to: email,
        subject: `We’d love your feedback – ${biz.business_name}`,
        html: `
          <p>Hello ${name || 'there'},</p>
          <p>We’d appreciate your feedback on your recent service:</p>
          <p><a href="${reviewLink}" target="_blank">${reviewLink}</a></p>
          <p>Thanks for your time!</p>
        `,
      });

      await db.execute(`UPDATE service_orders SET review_sent = 1 WHERE id = ?`, [service_order_id]);
    }

    res.json({ success: true, message: `Sent to ${orders.length} client(s)` });
  } catch (err) {
    console.error('❌ Failed to send internal review requests:', err);
    res.status(500).json({ error: 'Internal review request failed' });
  }
});

// GET: Google analytics (mock example)
router.get('/analytics/:business_id', async (req, res) => {
  const { business_id } = req.params;

  try {
    const [rows] = await db.execute(
      `SELECT rating AS label, COUNT(*) AS count
       FROM google_reviews
       WHERE business_id = ?
       GROUP BY rating
       ORDER BY rating DESC`,
      [business_id]
    );

    const analytics = rows.map(r => ({
      label: `${r.label} Stars`,
      count: r.count
    }));

    res.json({ analytics });
  } catch (err) {
    console.error('❌ Failed to fetch analytics:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});
// POST: Save Twilio credentials (SMS settings)
router.post('/sms-settings', async (req, res) => {
  const { business_id, sid, auth_token, phone_number } = req.body;

  if (!business_id || !sid || !auth_token || !phone_number) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const [existing] = await db.execute(
      'SELECT id FROM sms_settings WHERE business_id = ?',
      [business_id]
    );

    if (existing.length) {
      // Update if exists
      await db.execute(
        `UPDATE sms_settings
         SET twilio_sid = ?, twilio_auth_token = ?, twilio_phone = ?, updated_at = NOW()
         WHERE business_id = ?`,
        [sid, auth_token, phone_number, business_id]
      );
    } else {
      // Insert if new
      await db.execute(
        `INSERT INTO sms_settings (business_id, twilio_sid, twilio_auth_token, twilio_phone)
         VALUES (?, ?, ?, ?)`,
        [business_id, sid, auth_token, phone_number]
      );
    }

    res.json({ success: true, message: 'Twilio settings saved successfully' });
  } catch (err) {
    console.error('❌ Failed to save Twilio credentials:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// GET: Get Twilio credentials for a business
router.get('/sms-settings/:business_id', async (req, res) => {
  const { business_id } = req.params;

  try {
    const [[settings]] = await db.execute(
      `SELECT twilio_sid, twilio_auth_token, twilio_phone
       FROM sms_settings
       WHERE business_id = ?`,
      [business_id]
    );

    if (!settings) {
      return res.status(404).json({ error: 'Twilio settings not found' });
    }

    res.json({ settings });
  } catch (err) {
    console.error('❌ Failed to fetch Twilio settings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
const twilio = require('twilio');

router.post('/internal/send-sms/:businessId', async (req, res) => {
  const { businessId } = req.params;

  try {
    // ✅ Check if SMS is enabled
    const [[settings]] = await db.execute(
      `SELECT send_sms FROM review_settings WHERE business_id = ?`,
      [businessId]
    );

    if (!settings?.send_sms) {
      return res.status(400).json({ error: 'SMS sending is disabled' });
    }

    // ✅ Get Twilio credentials
    const [[twilioSettings]] = await db.execute(
      `SELECT twilio_sid, twilio_auth_token, twilio_phone FROM sms_settings WHERE business_id = ?`,
      [businessId]
    );

    if (!twilioSettings) {
      return res.status(400).json({ error: 'Twilio settings not found' });
    }

    const client = twilio(twilioSettings.twilio_sid, twilioSettings.twilio_auth_token);

    // ✅ Get completed service orders that haven't received SMS
    const [orders] = await db.execute(
      `SELECT o.id AS service_order_id, u.name, u.phone
       FROM service_orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.business_id = ?
         AND u.role = 'client'
         AND u.phone IS NOT NULL
         AND o.status = 'completed'
         AND o.review_sent_sms = 0`,
      [businessId]
    );

    if (!orders.length) {
      return res.status(404).json({ error: 'No eligible clients for SMS' });
    }

    for (const { service_order_id, name, phone } of orders) {
      const link = `https://${process.env.APP_DOMAIN}/review-internal?o=${service_order_id}`;
      const message = `Hi ${name || ''}, please leave a quick review of your recent service: ${link}`;

      await client.messages.create({
        from: twilioSettings.twilio_phone,
        to: phone,
        body: message,
      });

      await db.execute(
        `UPDATE service_orders SET review_sent_sms = 1 WHERE id = ?`,
        [service_order_id]
      );
    }

    res.json({ success: true, message: `✅ Sent ${orders.length} SMS messages` });
  } catch (err) {
    console.error('❌ Failed to send SMS reviews:', err);
    res.status(500).json({ error: 'Failed to send SMS reviews' });
  }
});

module.exports = router;
