// routes/plans.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // your existing promise pool

async function selectPlans({ withFeaturesCsv }) {
  const sql = withFeaturesCsv
    ? `SELECT id,name,slug,price,description,COALESCE(features_csv,'') AS features_csv
       FROM plans
       ORDER BY price ASC, name ASC`
    : `SELECT id,name,slug,price,description
       FROM plans
       ORDER BY price ASC, name ASC`;

  const [rows] = await pool.query(sql);
  return rows.map(r => ({
    id: Number(r.id),
    name: r.name || '',
    slug: r.slug || '',
    price: r.price == null ? 0 : Number(r.price),
    description: r.description || '',
    features: withFeaturesCsv ? (r.features_csv || '') : '' // pricing.js normalizes CSV/empty
  }));
}

router.get('/', async (req, res) => {
  try {
    // 0) Basic connectivity check (fast)
    await pool.query('SELECT 1');

    // 1) Try with features_csv
    let out;
    try {
      out = await selectPlans({ withFeaturesCsv: true });
    } catch (err) {
      // Unknown column? Fallback without features_csv
      if (err && (err.code === 'ER_BAD_FIELD_ERROR' || /unknown column/i.test(err.message))) {
        console.warn('⚠️ features_csv missing in DB; falling back without features');
        out = await selectPlans({ withFeaturesCsv: false });
      } else {
        throw err;
      }
    }

    res.setHeader('Cache-Control', 'no-store');
    res.json(out);
  } catch (err) {
    // Log full error on the server
    console.error('GET /plans failed:', err);

    // Redact internals in production
    const isProd = process.env.NODE_ENV === 'production';
    res.status(500).json({
      error: 'Failed to load plans',
      message: isProd ? undefined : (err && (err.sqlMessage || err.message || String(err))),
      code: isProd ? undefined : err && err.code
    });
  }
});

module.exports = router;
