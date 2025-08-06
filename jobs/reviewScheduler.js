const db = require('../db');
const { sendMail } = require('../utils/mailer');
const { sendSMS } = require('../utils/sms');
const { decrypt } = require('../utils/encryption');
const cron = require('node-cron');

async function processReviewQueue() {
  try {
    const [tickets] = await db.execute(`
      SELECT 
        t.id AS ticket_id,
        t.business_id,
        t.created_at AS ticket_created,
        u.email AS customer_email,
        u.phone AS customer_phone,
        r.google_review_link,
        r.enable_google,
        r.enable_internal,
        r.delay_minutes,
        r.send_email,
        r.send_sms
      FROM support_tickets t
      JOIN review_settings r ON r.business_id = t.business_id
      JOIN users u ON u.id = t.user_id
      WHERE t.status = 'Resolved' AND (t.review_sent = 0 OR t.review_sent IS NULL)
    `);

    for (const ticket of tickets) {
      const minutesElapsed = (Date.now() - new Date(ticket.ticket_created).getTime()) / 60000;
      if (minutesElapsed < ticket.delay_minutes) continue;

      // Get business info
      const [[business]] = await db.execute(`
        SELECT business_name, logo_filename, twilio_sid, twilio_auth_token, twilio_phone_number
        FROM businesses
        WHERE id = ?
      `, [ticket.business_id]);

      if (!business) continue;

      let twilioSid, twilioToken;
      try {
        twilioSid = decrypt(business.twilio_sid);
        twilioToken = decrypt(business.twilio_auth_token);
      } catch {
        console.error(`❌ Could not decrypt Twilio keys for business ${ticket.business_id}`);
        continue;
      }

      const businessName = business.business_name || 'Our Company';
      const logo = business.logo_filename
        ? `<img src="https://your-domain.com/uploads/${business.logo_filename}" alt="${businessName} Logo" style="max-height:80px;" />`
        : '';

      const internalReviewLink = `https://your-domain.com/review-internal?t=${ticket.ticket_id}`;
      const googleReviewLink = ticket.google_review_link;

      // =======================
      // Build email content
      // =======================
      const links = [];
      if (ticket.enable_google && googleReviewLink) {
        links.push(`<a href="${googleReviewLink}" style="background:#4F46E5;color:white;padding:12px 24px;border-radius:6px;text-decoration:none">Leave Google Review</a>`);
      }
      if (ticket.enable_internal) {
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

      // =======================
      // Send Email
      // =======================
      let sent = false;

      if (ticket.send_email && ticket.customer_email) {
        try {
          await sendMail({
            to: ticket.customer_email,
            subject: `We value your feedback – ${businessName}`,
            html: emailHtml,
          });
          console.log(`📧 Sent email to ${ticket.customer_email}`);
          sent = true;
        } catch (err) {
          console.error(`❌ Email failed to ${ticket.customer_email}:`, err.message);
        }
      }

      // =======================
      // Send SMS
      // =======================
      if (
        ticket.send_sms &&
        ticket.customer_phone &&
        business.twilio_phone_number &&
        twilioSid &&
        twilioToken
      ) {
        const smsBody = `We’d love your feedback!\n${
          ticket.enable_google && googleReviewLink ? `Google: ${googleReviewLink}\n` : ''
        }${
          ticket.enable_internal ? `Internal: ${internalReviewLink}` : ''
        }`;

        try {
          await sendSMS(
            {
              sid: twilioSid,
              authToken: twilioToken,
              from: business.twilio_phone_number,
            },
            ticket.customer_phone,
            smsBody
          );
          console.log(`📱 Sent SMS to ${ticket.customer_phone}`);
          sent = true;
        } catch (err) {
          console.error(`❌ SMS failed to ${ticket.customer_phone}:`, err.message);
        }
      }

      // =======================
      // Update ticket if sent
      // =======================
      if (sent) {
        await db.execute(`UPDATE support_tickets SET review_sent = 1 WHERE id = ?`, [ticket.ticket_id]);
      }
    }
  } catch (err) {
    console.error('❌ Error processing review queue:', err);
  }
}

// Run every 10 minutes
cron.schedule('*/10 * * * *', processReviewQueue);
console.log('✅ Review scheduler is running every 10 minutes');
