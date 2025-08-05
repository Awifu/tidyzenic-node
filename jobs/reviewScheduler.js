// jobs/reviewScheduler.js

const db = require('../db');
const { sendMail } = require('../utils/mailer');
const cron = require('node-cron');

async function processReviewQueue() {
  try {
    const [rows] = await db.execute(`
      SELECT 
        t.id AS ticket_id,
        t.business_id,
        t.created_at AS ticket_created,
        u.email AS customer_email,
        r.google_review_link,
        r.enable_google,
        r.enable_internal,
        r.delay_minutes
      FROM support_tickets t
      JOIN review_settings r ON r.business_id = t.business_id
      JOIN users u ON u.id = t.user_id
      WHERE t.status = 'Resolved' AND (t.review_sent = 0 OR t.review_sent IS NULL)
    `);

    for (const row of rows) {
      const minutesElapsed = (Date.now() - new Date(row.ticket_created).getTime()) / 60000;
      if (minutesElapsed < row.delay_minutes) continue;

      // 🔹 Fetch business info
      const [[business]] = await db.execute(
        `SELECT business_name, logo_filename FROM businesses WHERE id = ? LIMIT 1`,
        [row.business_id]
      );

      const businessName = business?.business_name || 'Our Business';
      const logoHtml = business?.logo_filename
        ? `<tr><td align="center" style="padding-bottom:20px;">
             <img src="https://your-domain.com/uploads/${business.logo_filename}" alt="${businessName} Logo" style="max-height:80px;" />
           </td></tr>`
        : '';

      // 🔹 Build review links
      const reviewLinks = [];

      if (row.enable_google && row.google_review_link) {
        reviewLinks.push(`
          <p style="margin: 20px 0;">
            <a href="${row.google_review_link}" target="_blank" style="background-color:#4F46E5;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">
              Leave a Google Review
            </a>
          </p>
        `);
      }

      if (row.enable_internal) {
        reviewLinks.push(`
          <p style="margin: 20px 0;">
            <a href="https://your-domain.com/review-internal?t=${row.ticket_id}" target="_blank" style="background-color:#10B981;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">
              Leave an Internal Review
            </a>
          </p>
        `);
      }

      // 🔹 Construct email HTML
      const emailHtml = `
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
          <tr>
            <td align="center">
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
                <tr>
                  <td align="center">
                    ${reviewLinks.join('')}
                  </td>
                </tr>
                <tr>
                  <td style="font-size:12px;color:#aaa;text-align:center;padding-top:30px;border-top:1px solid #eee;">
                    Sent by ${businessName}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `;

      // 🔹 Send the email
      await sendMail({
        to: row.customer_email,
        subject: `We’d love your feedback – ${businessName}`,
        html: emailHtml,
      });

      // 🔹 Mark as sent
      await db.execute(`UPDATE support_tickets SET review_sent = 1 WHERE id = ?`, [row.ticket_id]);

      console.log(`✅ Sent review request for ticket ${row.ticket_id} to ${row.customer_email}`);
    }
  } catch (error) {
    console.error('❌ Error processing review queue:', error);
  }
}

// Schedule every 10 minutes
cron.schedule('*/10 * * * *', processReviewQueue);
console.log('✅ Review scheduler is running every 10 minutes');
// jobs/reviewScheduler.js

const db = require('../db');
const { sendMail } = require('../utils/mailer');
const cron = require('node-cron');

async function processReviewQueue() {
  try {
    const [rows] = await db.execute(`
      SELECT 
        t.id AS ticket_id,
        t.business_id,
        t.created_at AS ticket_created,
        u.email AS customer_email,
        r.google_review_link,
        r.enable_google,
        r.enable_internal,
        r.delay_minutes
      FROM support_tickets t
      JOIN review_settings r ON r.business_id = t.business_id
      JOIN users u ON u.id = t.user_id
      WHERE t.status = 'Resolved' AND (t.review_sent = 0 OR t.review_sent IS NULL)
    `);

    for (const row of rows) {
      const minutesElapsed = (Date.now() - new Date(row.ticket_created).getTime()) / 60000;
      if (minutesElapsed < row.delay_minutes) continue;

      // 🔹 Fetch business info
      const [[business]] = await db.execute(
        `SELECT business_name, logo_filename FROM businesses WHERE id = ? LIMIT 1`,
        [row.business_id]
      );

      const businessName = business?.business_name || 'Our Business';
      const logoHtml = business?.logo_filename
        ? `<tr><td align="center" style="padding-bottom:20px;">
             <img src="https://your-domain.com/uploads/${business.logo_filename}" alt="${businessName} Logo" style="max-height:80px;" />
           </td></tr>`
        : '';

      // 🔹 Build review links
      const reviewLinks = [];

      if (row.enable_google && row.google_review_link) {
        reviewLinks.push(`
          <p style="margin: 20px 0;">
            <a href="${row.google_review_link}" target="_blank" style="background-color:#4F46E5;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">
              Leave a Google Review
            </a>
          </p>
        `);
      }

      if (row.enable_internal) {
        reviewLinks.push(`
          <p style="margin: 20px 0;">
            <a href="https://your-domain.com/review-internal?t=${row.ticket_id}" target="_blank" style="background-color:#10B981;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">
              Leave an Internal Review
            </a>
          </p>
        `);
      }

      // 🔹 Construct email HTML
      const emailHtml = `
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
          <tr>
            <td align="center">
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
                <tr>
                  <td align="center">
                    ${reviewLinks.join('')}
                  </td>
                </tr>
                <tr>
                  <td style="font-size:12px;color:#aaa;text-align:center;padding-top:30px;border-top:1px solid #eee;">
                    Sent by ${businessName}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `;

      // 🔹 Send the email
      await sendMail({
        to: row.customer_email,
        subject: `We’d love your feedback – ${businessName}`,
        html: emailHtml,
      });

      // 🔹 Mark as sent
      await db.execute(`UPDATE support_tickets SET review_sent = 1 WHERE id = ?`, [row.ticket_id]);

      console.log(`✅ Sent review request for ticket ${row.ticket_id} to ${row.customer_email}`);
    }
  } catch (error) {
    console.error('❌ Error processing review queue:', error);
  }
}

// Schedule every 10 minutes
cron.schedule('*/10 * * * *', processReviewQueue);
console.log('✅ Review scheduler is running every 10 minutes');
// jobs/reviewScheduler.js

const db = require('../db');
const { sendMail } = require('../utils/mailer');
const cron = require('node-cron');

async function processReviewQueue() {
  try {
    const [rows] = await db.execute(`
      SELECT 
        t.id AS ticket_id,
        t.business_id,
        t.created_at AS ticket_created,
        u.email AS customer_email,
        r.google_review_link,
        r.enable_google,
        r.enable_internal,
        r.delay_minutes
      FROM support_tickets t
      JOIN review_settings r ON r.business_id = t.business_id
      JOIN users u ON u.id = t.user_id
      WHERE t.status = 'Resolved' AND (t.review_sent = 0 OR t.review_sent IS NULL)
    `);

    for (const row of rows) {
      const minutesElapsed = (Date.now() - new Date(row.ticket_created).getTime()) / 60000;
      if (minutesElapsed < row.delay_minutes) continue;

      // 🔹 Fetch business info
      const [[business]] = await db.execute(
        `SELECT business_name, logo_filename FROM businesses WHERE id = ? LIMIT 1`,
        [row.business_id]
      );

      const businessName = business?.business_name || 'Our Business';
      const logoHtml = business?.logo_filename
        ? `<tr><td align="center" style="padding-bottom:20px;">
             <img src="https://your-domain.com/uploads/${business.logo_filename}" alt="${businessName} Logo" style="max-height:80px;" />
           </td></tr>`
        : '';

      // 🔹 Build review links
      const reviewLinks = [];

      if (row.enable_google && row.google_review_link) {
        reviewLinks.push(`
          <p style="margin: 20px 0;">
            <a href="${row.google_review_link}" target="_blank" style="background-color:#4F46E5;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">
              Leave a Google Review
            </a>
          </p>
        `);
      }

      if (row.enable_internal) {
        reviewLinks.push(`
          <p style="margin: 20px 0;">
            <a href="https://your-domain.com/review-internal?t=${row.ticket_id}" target="_blank" style="background-color:#10B981;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">
              Leave an Internal Review
            </a>
          </p>
        `);
      }

      // 🔹 Construct email HTML
      const emailHtml = `
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
          <tr>
            <td align="center">
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
                <tr>
                  <td align="center">
                    ${reviewLinks.join('')}
                  </td>
                </tr>
                <tr>
                  <td style="font-size:12px;color:#aaa;text-align:center;padding-top:30px;border-top:1px solid #eee;">
                    Sent by ${businessName}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `;

      // 🔹 Send the email
      await sendMail({
        to: row.customer_email,
        subject: `We’d love your feedback – ${businessName}`,
        html: emailHtml,
      });

      // 🔹 Mark as sent
      await db.execute(`UPDATE support_tickets SET review_sent = 1 WHERE id = ?`, [row.ticket_id]);

      console.log(`✅ Sent review request for ticket ${row.ticket_id} to ${row.customer_email}`);
    }
  } catch (error) {
    console.error('❌ Error processing review queue:', error);
  }
}

// Schedule every 10 minutes
cron.schedule('*/10 * * * *', processReviewQueue);
console.log('✅ Review scheduler is running every 10 minutes');
