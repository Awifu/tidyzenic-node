// routes/plans.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // you already have this

// GET /plans  -> used by public/scripts/pricing.js
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        id,
        name,
        slug,
        price,
        description,
        COALESCE(features_csv, '') AS features_csv
      FROM plans
      ORDER BY price ASC, name ASC
    `);

    // pricing.js accepts array OR CSV string under "features"
    const out = rows.map(r => ({
      id: Number(r.id),
      name: r.name || '',
      slug: r.slug || '',
      price: r.price == null ? 0 : Number(r.price),
      description: r.description || '',
      features: r.features_csv || ''
    }));

    res.setHeader('Cache-Control', 'no-store');
    res.json(out);
  } catch (err) {
    console.error('GET /plans failed:', err);
    res.status(500).json({ error: 'Failed to load plans' });
  }
});

module.exports = router;
