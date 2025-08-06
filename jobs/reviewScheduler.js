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

      // 🔹 Fetch business and encrypted Twilio info
      const [[business]] = await db.execute(
        `SELECT business_name, logo_filename, twilio_sid, twilio_auth_token, twilio_phone_number
         FROM businesses WHERE id = ? LIMIT 1`,
        [ticket.business_id]
      );

      if (!business) continue;

      // 🔹 Decrypt Twilio credentials
      let twilioSid, twilioToken;
      try {
        twilioSid = decrypt(business.twilio_sid);
        twilioToken = decrypt(business.twilio_auth_token);
      } catch (e) {
        console.error(`❌ Failed to decrypt Twilio credentials for business ${ticket.business_id}`);
        continue;
      }

      const businessName = business.business_name || 'Our Business';
      const logoHtml = business.logo_filename
        ? `<tr><td align="center" style="padding-bottom:20px;">
             <img src="https://your-domain.com/uploads/${business.logo_filename}" alt="${businessName} Logo" style="max-height:80px;" />
           </td></tr>`
        : '';

      // 🔹 Build review links
      const links = [];
      const googleReviewLink = ticket.google_review_link;
      const internalReviewLink = `https://your-domain.com/review-internal?t=${ticket.ticket_id}`;

      if (ticket.enable_google && googleReviewLink) {
        links.push(`
          <p style="margin: 20px 0;">
            <a href="${googleReviewLink}" target="_blank" style="background-color:#4F46E5;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">
              Leave a Google Review
            </a>
          </p>`);
      }

      if (ticket.enable_internal) {
        links.push(`
          <p style="margin: 20px 0;">
            <a href="${internalReviewLink}" target="_blank" style="background-color:#10B981;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">
              Leave an Internal Review
            </a>
          </p>`);
      }

      // 🔹 Build email content
      const emailHtml = `
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
          <tr><td align="center">
            <table width="100%" style="max-width:600px;background-color:#fff;border-radius:8px;padding:40px;font-family:sans-serif;">
              ${logoHtml}
              <tr>
                <td style="font-size:18px;font-weight:bold;color:#333;text-align:center;padding-bottom:10px;">
                  We'd love your feedback!
                </td>
              </tr>
              <tr>
                <td style="font-size:15px;color:#555;text-align:center;padding-bottom:20px;">
                  Thank you for choosing ${businessName}. Please take a moment to share your experience:
                </td>
              </tr>
              <tr><td align="center">${links.join('')}</td></tr>
              <tr>
                <td style="font-size:12px;color:#aaa;text-align:center;padding-top:30px;border-top:1px solid #eee;">
                  Sent by ${businessName}
                </td>
              </tr>
            </table>
          </td></tr>
        </table>`;

      // 🔹 Send Email
      if (ticket.send_email && ticket.customer_email) {
        try {
          await sendMail({
            to: ticket.customer_email,
            subject: `We’d love your feedback – ${businessName}`,
            html: emailHtml,
          });
          console.log(`📧 Email sent to ${ticket.customer_email} for ticket ${ticket.ticket_id}`);
        } catch (e) {
          console.error(`❌ Failed to send email for ticket ${ticket.ticket_id}:`, e.message);
        }
      }

      // 🔹 Send SMS
      if (ticket.send_sms && ticket.customer_phone && twilioSid && twilioToken && business.twilio_phone_number) {
        let smsBody = `We’d love your feedback!`;
        if (ticket.enable_google && googleReviewLink) smsBody += ` Google: ${googleReviewLink}`;
        if (ticket.enable_internal) smsBody += ` or here: ${internalReviewLink}`;

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
          console.log(`📱 SMS sent to ${ticket.customer_phone} for ticket ${ticket.ticket_id}`);
        } catch (e) {
          console.error(`❌ Failed to send SMS for ticket ${ticket.ticket_id}:`, e.message);
        }
      }

      // 🔹 Mark ticket as review_sent
      await db.execute(`UPDATE support_tickets SET review_sent = 1 WHERE id = ?`, [ticket.ticket_id]);
    }
  } catch (err) {
    console.error('❌ Error processing review queue:', err);
  }
}

// 🔁 Run every 10 minutes
cron.schedule('*/10 * * * *', processReviewQueue);
console.log('✅ Review scheduler is running every 10 minutes');
