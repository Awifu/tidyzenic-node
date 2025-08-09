// routes/plans.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// cache schema once
let schemaChecked = false;
let hasFeaturesCsv = false;
let hasFeaturesJson = false;

async function checkSchemaOnce() {
  if (schemaChecked) return;
  const [rows] = await pool.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'plans'
  `);
  const cols = new Set(rows.map(r => r.COLUMN_NAME));
  hasFeaturesCsv = cols.has('features_csv');
  hasFeaturesJson = cols.has('features');
  schemaChecked = true;
}

async function selectPlans() {
  await checkSchemaOnce();

  const select = [
    'id',
    'name',
    'slug',
    'price',
    'description',
    hasFeaturesJson ? "JSON_EXTRACT(features, '$') AS features_json" : null,
    hasFeaturesCsv  ? "COALESCE(features_csv, '') AS features_csv"   : null,
  ].filter(Boolean).join(', ');

  const [rows] = await pool.query(`
    SELECT ${select}
    FROM plans
    ORDER BY price ASC, name ASC
  `);

  return rows.map(r => {
    let features = '';
    if (hasFeaturesJson && r.features_json != null) {
      features = String(r.features_json); // pricing.js will parse if it starts with '['
    } else if (hasFeaturesCsv) {
      features = r.features_csv || '';
    }
    return {
      id: Number(r.id),
      name: r.name || '',
      slug: r.slug || '',
      price: r.price == null ? 0 : Number(r.price),
      description: r.description || '',
      features,
    };
  });
}

router.get('/', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    const plans = await selectPlans();
    res.setHeader('Cache-Control', 'no-store');
    res.json(plans);
  } catch (err) {
    console.error('GET /plans failed:', err);
    const prod = process.env.NODE_ENV === 'production';
    res.status(500).json({
      error: 'Failed to load plans',
      message: prod ? undefined : (err.sqlMessage || err.message || String(err)),
      code: prod ? undefined : err.code,
    });
  }
});

module.exports = router;
