const express = require('express');
const router = express.Router();
const db = require('../db'); // adjust path if needed

// GET templates for a business
router.get('/:businessId', async (req, res) => {
  const { businessId } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT email_subject, email_body, sms_body 
       FROM review_templates 
       WHERE business_id = ? LIMIT 1`,
      [businessId]
    );

    if (!rows.length) return res.json({ template: null });

    res.json({ template: rows[0] });
  } catch (err) {
    console.error('❌ Error fetching templates:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST (create or update) templates
router.post('/', async (req, res) => {
  const { business_id, email_subject, email_body, sms_body } = req.body;

  if (!business_id) {
    return res.status(400).json({ error: 'Missing business_id' });
  }

  try {
    await db.query(
      `INSERT INTO review_templates (business_id, email_subject, email_body, sms_body)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         email_subject = VALUES(email_subject),
         email_body = VALUES(email_body),
         sms_body = VALUES(sms_body)`,
      [business_id, email_subject || '', email_body || '', sms_body || '']
    );

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error saving template:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
