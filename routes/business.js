const express = require('express');
const router = express.Router();
const pool = require('../db');
const LRU = require('lru-cache'); // ✅ Correct import for v7 in CommonJS

const cache = new LRU({
  max: 100,
  ttl: 1000 * 60 * 5
});

router.get('/public', async (req, res) => {
  let subdomain = req.tenant;

  if (!subdomain && process.env.NODE_ENV !== 'production') {
    subdomain = 'awifu-labs-pro';
    console.warn('⚠️ Using fallback subdomain for local testing:', subdomain);
  }

  if (!subdomain) {
    return res.status(400).json({ error: 'Subdomain is required' });
  }

  const cacheKey = `public-business:${subdomain}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const [rows] = await pool.query(
      `SELECT id, business_name, logo_filename
       FROM businesses
       WHERE subdomain = ? AND is_deleted = 0
       LIMIT 1`,
      [subdomain]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const data = {
      id: rows[0].id,
      business_name: rows[0].business_name,
      logo_filename: rows[0].logo_filename
    };

    cache.set(cacheKey, data);
    console.log('📦 Cached business data for:', subdomain);
    res.json(data);
  } catch (err) {
    console.error('❌ Error fetching public business info:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
