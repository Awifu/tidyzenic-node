const db = require('../db');
const { sendMail } = require('../utils/mailer');
const { sendSMS } = require('../utils/sms');
const { decrypt } = require('../utils/encryption');
const cron = require('node-cron');

async function processReviewQueue() {
  try {
    const [orders] = await db.execute(`
      SELECT 
        o.id AS service_order_id,
        o.business_id,
        o.completed_at,
        o.review_sent,
        u.email AS customer_email,
        u.phone AS customer_phone,
        r.google_review_link,
        r.enable_google,
        r.enable_internal,
        r.delay_minutes,
        r.send_email,
        r.send_sms
      FROM service_orders o
      JOIN review_settings r ON r.business_id = o.business_id
      JOIN users u ON u.id = o.user_id
      WHERE o.status = 'completed'
        AND (o.review_sent = 0 OR o.review_sent IS NULL)
    `);

    for (const order of orders) {
      const minutesElapsed = (Date.now() - new Date(order.completed_at).getTime()) / 60000;
      if (minutesElapsed < order.delay_minutes) continue;

      // Fetch business info
      const [[business]] = await db.execute(`
        SELECT business_name, logo_filename, twilio_sid, twilio_auth_token, twilio_phone_number, subdomain, custom_domain
        FROM businesses
        WHERE id = ?
      `, [order.business_id]);

      if (!business) continue;

      let twilioSid, twilioToken;
      try {
        twilioSid = decrypt(business.twilio_sid);
        twilioToken = decrypt(business.twilio_auth_token);
      } catch {
        console.error(`❌ Could not decrypt Twilio keys for business ${order.business_id}`);
        continue;
      }

      const businessName = business.business_name || 'Our Company';
      const logo = business.logo_filename
        ? `<img src="https://tidyzenic.com/uploads/${business.logo_filename}" alt="${businessName} Logo" style="max-height:80px;" />`
        : '';

      const domain = business.custom_domain
        ? `https://${business.custom_domain}`
        : `https://${business.subdomain}.tidyzenic.com`;

      const internalReviewLink = `${domain}/review-internal?o=${order.service_order_id}`;
      const googleReviewLink = order.google_review_link;

      // ------------------------
      // 📧 Email content
      // ------------------------
      const links = [];
      if (order.enable_google && googleReviewLink) {
        links.push(`<a href="${googleReviewLink}" style="background:#4F46E5;color:white;padding:12px 24px;border-radius:6px;text-decoration:none">Leave Google Review</a>`);
      }
      if (order.enable_internal) {
        links.push(`<a href="${internalReviewLink}" style="background:#10B981;color:white;padding:12px 24px;border-radius:6px;text-decoration:none">Leave Internal Review</a>`);
      }

      const emailHtml = `
        <div style="font-family:sans-serif;text-align:center;padding:40px;background:#f4f4f4">
          <div style="background:white;padding:40px;border-radius:8px;max-width:600px;margin:auto">
            ${logo ? `<div style="margin-bottom:20px">${logo}</div>` : ''}
            <h2>We’d love your feedback!</h2>
            <p>Thank you for choosing ${businessName}. Please take a moment to leave a review:</p>
            <div style="margin-top:30px">${links.join('<br><br>')}</div>
          </div>
        </div>
      `;

      let sent = false;

      // ------------------------
      // ✉️ Send Email
      // ------------------------
      if (order.send_email && order.customer_email) {
        try {
          await sendMail({
            to: order.customer_email,
            subject: `We value your feedback – ${businessName}`,
            html: emailHtml,
          });
          console.log(`📧 Sent email to ${order.customer_email}`);
          sent = true;
        } catch (err) {
          console.error(`❌ Email failed to ${order.customer_email}:`, err.message);
        }
      }

      // ------------------------
      // 📱 Send SMS
      // ------------------------
      if (
        order.send_sms &&
        order.customer_phone &&
        business.twilio_phone_number &&
        twilioSid &&
        twilioToken
      ) {
        const smsBody = `We’d love your feedback!\n${
          order.enable_google && googleReviewLink ? `Google: ${googleReviewLink}\n` : ''
        }${
          order.enable_internal ? `Internal: ${internalReviewLink}` : ''
        }`;

        try {
          await sendSMS(
            {
              sid: twilioSid,
              authToken: twilioToken,
              from: business.twilio_phone_number,
            },
            order.customer_phone,
            smsBody
          );
          console.log(`📱 Sent SMS to ${order.customer_phone}`);
          sent = true;
        } catch (err) {
          console.error(`❌ SMS failed to ${order.customer_phone}:`, err.message);
        }
      }

      // ------------------------
      // ✅ Mark as sent
      // ------------------------
      if (sent) {
        await db.execute(`UPDATE service_orders SET review_sent = 1 WHERE id = ?`, [order.service_order_id]);
      }
    }
  } catch (err) {
    console.error('❌ Error processing review queue:', err);
  }
}

// Schedule: every 10 minutes
cron.schedule('*/10 * * * *', processReviewQueue);
console.log('✅ Review scheduler is running every 10 minutes');
