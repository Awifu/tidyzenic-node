const express = require('express');
const router = express.Router();
const db = require('../db');
const twilio = require('twilio');
const { sendMail } = require('../utils/mailer');

// ----------------------
// 🔧 Helper: Format phone
// ----------------------
function formatToE164(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  if (digits.length >= 11 && phone.startsWith('+')) return phone;
  return null;
}

// ----------------------
// 📩 Submit Internal Review
// ----------------------
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
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Submit review error:', err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// ----------------------
// 📊 Fetch Internal Reviews
// ----------------------
router.get('/internal/:business_id', async (req, res) => {
  const { business_id } = req.params;

  try {
    const [reviews] = await db.execute(
      `SELECT r.ticket_id, r.rating, r.message, r.created_at,
              client.name AS client_name, sp.name AS service_provider_name, s.name AS service_name
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
    console.error('❌ Fetch internal reviews error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// ----------------------
// ⚙️ Get + Update Review Settings
// ----------------------
router.get('/settings/:business_id', async (req, res) => {
  try {
    const { business_id } = req.params;
    const [[settings]] = await db.execute(`SELECT * FROM review_settings WHERE business_id = ?`, [business_id]);

    if (!settings) return res.status(404).json({ error: 'Settings not found' });
    res.json({ settings });
  } catch (err) {
    console.error('❌ Fetch settings error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.post('/settings', async (req, res) => {
  const { business_id, enable_internal } = req.body;

  if (!business_id) return res.status(400).json({ error: 'business_id is required' });

  try {
    const [result] = await db.execute(
      `UPDATE review_settings SET enable_internal = ? WHERE business_id = ?`,
      [enable_internal ? 1 : 0, business_id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Settings not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Update settings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ----------------------
// 📨 Send Internal Review Emails
// ----------------------
router.post('/internal/send/:businessId', async (req, res) => {
  const { businessId } = req.params;

  try {
    const [[settings]] = await db.execute(
      `SELECT enable_internal FROM review_settings WHERE business_id = ?`,
      [businessId]
    );
    if (!settings?.enable_internal) return res.status(400).json({ error: 'Internal reviews disabled' });

    const [orders] = await db.execute(
      `SELECT u.email, u.name, o.id AS service_order_id
       FROM service_orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.business_id = ?
         AND u.role = 'client' AND u.is_verified = 1 AND u.is_deleted = 0
         AND u.email IS NOT NULL AND o.status = 'completed' AND o.review_sent = 0
       ORDER BY o.completed_at DESC`,
      [businessId]
    );

    if (!orders.length) return res.status(404).json({ error: 'No eligible clients found' });

    const [[biz]] = await db.execute(
      `SELECT business_name, custom_domain, subdomain FROM businesses WHERE id = ?`,
      [businessId]
    );

    for (const { email, name, service_order_id } of orders) {
      const reviewLink = biz.custom_domain
        ? `https://${biz.custom_domain}/review-internal?o=${service_order_id}`
        : `https://${biz.subdomain}.tidyzenic.com/review-internal?o=${service_order_id}`;

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
    console.error('❌ Send review error:', err);
    res.status(500).json({ error: 'Failed to send reviews' });
  }
});

// ----------------------
// 📈 Google CTR Analytics
// ----------------------
router.get('/analytics/google/:business_id', async (req, res) => {
  try {
    const { business_id } = req.params;
    const [data] = await db.execute(
      `SELECT channel, COUNT(*) AS total_sent,
              SUM(CASE WHEN clicked_at IS NOT NULL THEN 1 ELSE 0 END) AS total_clicked
       FROM review_link_logs
       WHERE business_id = ? AND type = 'google'
       GROUP BY channel`,
      [business_id]
    );

    const formatted = data.map(row => ({
      channel: row.channel,
      sent: row.total_sent,
      clicked: row.total_clicked,
      ctr: row.total_sent > 0 ? ((row.total_clicked / row.total_sent) * 100).toFixed(2) + '%' : '0%'
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    console.error('❌ Google analytics error:', err);
    res.status(500).json({ error: 'Analytics failed' });
  }
});

// ----------------------
// 🔐 Validate Twilio
// ----------------------
router.post('/sms/validate', async (req, res) => {
  const { twilio_sid, twilio_auth_token } = req.body;
  if (!twilio_sid || !twilio_auth_token) {
    return res.status(400).json({ valid: false, error: 'Missing credentials' });
  }

  try {
    const client = twilio(twilio_sid, twilio_auth_token);
    await client.api.accounts(twilio_sid).fetch();
    res.json({ valid: true });
  } catch (err) {
    console.error('❌ Twilio validation error:', err.message);
    res.status(400).json({ valid: false, error: err.message });
  }
});

// ----------------------
// 💾 Save Twilio Settings
// ----------------------
router.post('/sms-settings', async (req, res) => {
  const { business_id, sid, auth_token, phone_number } = req.body;
  if (!business_id || !sid || !auth_token || !phone_number) {
    return res.status(400).json({ error: 'All fields required' });
  }

  try {
    const [existing] = await db.execute(`SELECT id FROM sms_settings WHERE business_id = ?`, [business_id]);

    if (existing.length) {
      await db.execute(
        `UPDATE sms_settings SET twilio_sid = ?, twilio_auth_token = ?, twilio_phone = ?, updated_at = NOW()
         WHERE business_id = ?`,
        [sid, auth_token, phone_number, business_id]
      );
    } else {
      await db.execute(
        `INSERT INTO sms_settings (business_id, twilio_sid, twilio_auth_token, twilio_phone)
         VALUES (?, ?, ?, ?)`,
        [business_id, sid, auth_token, phone_number]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Save Twilio error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ----------------------
// 📱 Get Twilio Settings
// ----------------------
router.get('/sms-settings/:business_id', async (req, res) => {
  try {
    const { business_id } = req.params;
    const [[settings]] = await db.execute(
      `SELECT twilio_sid, twilio_auth_token, twilio_phone
       FROM sms_settings WHERE business_id = ?`,
      [business_id]
    );

    if (!settings) return res.status(404).json({ error: 'Not found' });
    res.json({ settings });
  } catch (err) {
    console.error('❌ Fetch Twilio settings error:', err);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

// ----------------------
// 🔗 Track Review Link Click
// ----------------------
router.get('/review/click', async (req, res) => {
  const { service_order_id, type, channel } = req.query;

  if (!service_order_id || !type || !channel) {
    return res.status(400).send('Missing required parameters');
  }

  try {
    await db.execute(
      `UPDATE review_link_logs SET clicked_at = NOW()
       WHERE service_order_id = ? AND type = ? AND channel = ?`,
      [service_order_id, type, channel]
    );

    if (type === 'internal') {
      const [[biz]] = await db.execute(
        `SELECT subdomain, custom_domain
         FROM businesses
         JOIN service_orders ON businesses.id = service_orders.business_id
         WHERE service_orders.id = ?`,
        [service_order_id]
      );

      const domain = biz.custom_domain
        ? `https://${biz.custom_domain}`
        : `https://${biz.subdomain}.tidyzenic.com`;

      return res.redirect(`${domain}/review-internal?o=${service_order_id}`);
    }

    if (type === 'google') {
      const [[row]] = await db.execute(
        `SELECT link FROM review_link_logs
         WHERE service_order_id = ? AND type = ? AND channel = ? LIMIT 1`,
        [service_order_id, type, channel]
      );

      return res.redirect(row?.link || '/');
    }

    return res.redirect('/');
  } catch (err) {
    console.error('❌ Error tracking review click:', err);
    res.status(500).send('Error');
  }
});

// ----------------------
// 📈 CTR & Hourly Click Analytics
// ----------------------
router.get('/analytics/links/:business_id', async (req, res) => {
  try {
    const { business_id } = req.params;
    const [data] = await db.execute(
      `SELECT type, channel,
              COUNT(*) AS total_sent,
              SUM(CASE WHEN clicked_at IS NOT NULL THEN 1 ELSE 0 END) AS total_clicked
       FROM review_link_logs
       WHERE business_id = ?
       GROUP BY type, channel`,
      [business_id]
    );

    const formatted = data.map(row => ({
      type: row.type,
      channel: row.channel,
      sent: row.total_sent,
      clicked: row.total_clicked,
      ctr: row.total_sent > 0 ? ((row.total_clicked / row.total_sent) * 100).toFixed(2) + '%' : '0%'
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    console.error('❌ CTR analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

router.get('/analytics/clicks/hourly/:business_id', async (req, res) => {
  try {
    const { business_id } = req.params;
    const [rows] = await db.execute(
      `SELECT HOUR(clicked_at) AS hour, COUNT(*) AS clicks
       FROM review_link_logs
       WHERE business_id = ? AND clicked_at IS NOT NULL
       GROUP BY HOUR(clicked_at)
       ORDER BY hour`,
      [business_id]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('❌ Hourly analytics error:', err);
    res.status(500).json({ error: 'Failed to load hourly data' });
  }
});

module.exports = router;
