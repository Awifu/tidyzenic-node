// routes/support.js

const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// Transport config
const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// POST /api/support
router.post('/', async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: '❌ All fields are required.' });
  }

  const mailOptions = {
    from: `${name} <${email}>`,
    to: process.env.EMAIL_USER,
    subject: `🆘 Support Request: ${subject}`,
    html: `
      <p><strong>From:</strong> ${name} (${email})</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, '<br>')}</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return res.status(200).json({ message: '✅ Your message has been sent!' });
  } catch (err) {
    console.error('❌ Email send failed:', err);
    return res.status(500).json({ error: '❌ Failed to send email. Please try again later.' });
  }
});

module.exports = router;
