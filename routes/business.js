const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { LRUCache } = require('lru-cache');

// 🧠 In-memory cache (5 min)
const cache = new LRUCache({
  max: 100,
  ttl: 1000 * 60 * 5
});

// 🔐 GET /api/business (requires auth + subdomain)
router.get('/', auth, async (req, res) => {
  const subdomain = req.tenant;
  const userBusinessId = req.user?.business_id;

  if (!subdomain) {
    return res.status(400).json({ error: 'Subdomain is required' });
  }

  const cacheKey = `business:${subdomain}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`⚡ Cache hit: ${subdomain}`);
    return res.json(cached);
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, business_name, logo_filename FROM businesses WHERE subdomain = ? AND is_deleted = 0 LIMIT 1',
      [subdomain]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const business = rows[0];

    if (business.id !== userBusinessId) {
      return res.status(403).json({ error: 'Unauthorized for this business' });
    }

    cache.set(cacheKey, business);
    console.log(`✅ Cached business: ${business.business_name}`);
    res.json(business);
  } catch (err) {
    console.error('❌ Error fetching business:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
