// ✅ GET /api/business/public – Get basic business info via subdomain (no auth)
router.get('/public', async (req, res) => {
  const subdomain = req.tenant;
  if (!subdomain) {
    return res.status(400).json({ error: 'Subdomain is required' });
  }

  const cacheKey = `public-business:${subdomain}`;
  const cached = cache.get(cacheKey);
  if (cached) {
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

    const publicData = {
      id: rows[0].id,
      business_name: rows[0].business_name,
      logo_filename: rows[0].logo_filename
    };

    cache.set(cacheKey, publicData);
    res.json(publicData);
  } catch (err) {
    console.error('❌ Error fetching public business info:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
