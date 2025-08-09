// routes/plans.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Cache schema detection so we don't hit INFORMATION_SCHEMA every request
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
  hasFeaturesJson = cols.has('features'); // JSON column if you add it later
  schemaChecked = true;
}

async function selectPlans() {
  await checkSchemaOnce();

  // Build SELECT safely based on columns that actually exist
  const selectCols = [
    'id',
    'name',
    'slug',
    'price',
    'description',
  ];
  if (hasFeaturesJson) selectCols.push("JSON_EXTRACT(features, '$') AS features_json");
  if (hasFeaturesCsv)  selectCols.push("COALESCE(features_csv, '') AS features_csv");

  const sql = `
    SELECT ${selectCols.join(', ')}
    FROM plans
    ORDER BY price ASC, name ASC
  `;

  const [rows] = await pool.query(sql);

  return rows.map(r => {
    // Prefer JSON features if present; otherwise CSV string; otherwise empty string.
    let features = '';
    if (hasFeaturesJson && r.features_json != null) {
      // mysql2 returns JSON as string; pass it through. pricing.js will JSON.parse if it starts with '['
      features = String(r.features_json);
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
    // quick connectivity sanity check
    await pool.query('SELECT 1');

    const out = await selectPlans();

    res.setHeader('Cache-Control', 'no-store');
    res.json(out);
  } catch (err) {
    console.error('GET /plans failed:', err);
    const isProd = process.env.NODE_ENV === 'production';
    res.status(500).json({
      error: 'Failed to load plans',
      message: isProd ? undefined : (err.sqlMessage || err.message || String(err)),
      code: isProd ? undefined : err.code
    });
  }
});

module.exports = router;
