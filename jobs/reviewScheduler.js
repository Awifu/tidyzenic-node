const db = require('../db');
const { sendMail } = require('../utils/mailer');
const cron = require('node-cron');

async function processReviewQueue() {
  const [rows] = await db.execute(`
    SELECT t.id AS ticket_id, r.google_review_link, r.enable_google, r.enable_internal, r.delay_minutes,
           u.email AS customer_email, t.created_at AS ticket_created
    FROM support_tickets t
    JOIN review_settings r ON r.business_id = t.business_id
    JOIN users u ON u.id = t.user_id
    WHERE t.status='Resolved' AND (t.review_sent=0 OR t.review_sent IS NULL)
  `);

  for (const row of rows) {
    const elapsed = (Date.now() - new Date(row.ticket_created).getTime()) / 60000;
    if (elapsed < row.delay_minutes) continue;

    let html = '<p>We hope you enjoyed your service. We’d appreciate your feedback.</p>';
    if (row.enable_google && row.google_review_link) {
      html = `<p>Kindly leave us a Google review:<br><a href="${row.google_review_link}" target="_blank">Click to review</a></p>`;
    }
    if (row.enable_internal) {
      html += '<p>Or leave us an internal review here: <a href="https://your-app.com/review-internal?t=' + row.ticket_id + '">Leave internal review</a></p>';
    }

    await sendMail({
      to: row.customer_email,
      subject: 'We’d love your feedback!',
      html,
    });

    await db.execute('UPDATE support_tickets SET review_sent = 1 WHERE id = ?', [row.ticket_id]);
  }
}

// Run every 10 minutes
cron.schedule('*/10 * * * *', processReviewQueue);
console.log('✅ Review scheduler is running every 10 minutes');
