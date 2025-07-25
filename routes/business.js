const express = require('express');
const router = express.Router();
const pool = require('../db'); // adjust path if needed

router.get('/business', async (req, res) => {
  const { subdomain } = req.query;

  if (!subdomain) {
    return res.status(400).json({ error: 'Missing subdomain parameter' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT business_name, logo_filename FROM businesses WHERE subdomain = ? LIMIT 1',
      [subdomain]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Business not found' });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching business:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
