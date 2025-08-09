// routes/plans.js
const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');

/**
 * ENV needed:
 *  DB_HOST, DB_USER, DB_PASS, DB_NAME
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'app',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
  charset: 'utf8mb4'
});

/**
 * GET /plans
 * Returns:
 * [
 *   { id, name, price: "19.00", slug, description, features: "A||B||C" }
 * ]
 */
router.get('/', async (req, res, next) => {
  try {
    // Filter out null/empty labels so CSV never contains "null"
    const sql = `
      SELECT
        p.id,
        p.name,
        p.price,          -- DECIMAL
        p.slug,
        p.description,
        GROUP_CONCAT(
          CASE
            WHEN f.label IS NOT NULL AND f.label <> ''
              THEN TRIM(CONCAT(f.label, IFNULL(CONCAT(' (', pf.value, ')'), '')))
            ELSE NULL
          END
          ORDER BY COALESCE(pf.sort_order, f.sort_order), f.label
          SEPARATOR '||'
        ) AS features_csv
      FROM plans p
      LEFT JOIN plan_features pf
        ON pf.plan_id = p.id AND pf.included = 1
      LEFT JOIN features f
        ON f.id = pf.feature_id
      GROUP BY p.id
      ORDER BY p.price ASC, p.name ASC
    `;

    const [rows] = await pool.query(sql);

    const payload = rows.map((r) => ({
      id: r.id,
      name: r.name,
      price: Number(r.price ?? 0).toFixed(2), // "19.00" as string for your UI
      slug: r.slug,
      description: r.description || defaultDescription(r.slug),
      // Your frontend supports array/JSON too, but we keep CSV for simplicity.
      features: r.features_csv || ''
    }));

    // Mild caching to reduce DB hits
    res.set('Cache-Control', 'public, max-age=60');
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

// Optional: GET /plans/:slug (handy for detail pages)
router.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const sql = `
      SELECT
        p.id, p.name, p.price, p.slug, p.description,
        GROUP_CONCAT(
          CASE
            WHEN f.label IS NOT NULL AND f.label <> ''
              THEN TRIM(CONCAT(f.label, IFNULL(CONCAT(' (', pf.value, ')'), '')))
            ELSE NULL
          END
          ORDER BY COALESCE(pf.sort_order, f.sort_order), f.label
          SEPARATOR '||'
        ) AS features_csv
      FROM plans p
      LEFT JOIN plan_features pf
        ON pf.plan_id = p.id AND pf.included = 1
      LEFT JOIN features f
        ON f.id = pf.feature_id
      WHERE p.slug = :slug
      GROUP BY p.id
      LIMIT 1
    `;
    const [rows] = await pool.query(sql, { slug });
    if (!rows.length) return res.status(404).json({ error: 'Plan not found' });

    const r = rows[0];
    res.json({
      id: r.id,
      name: r.name,
      price: Number(r.price ?? 0).toFixed(2),
      slug: r.slug,
      description: r.description || defaultDescription(r.slug),
      features: r.features_csv || ''
    });
  } catch (err) {
    next(err);
  }
});

function defaultDescription(slug) {
  if (slug === 'starter') return 'Everything you need to get started.';
  if (slug === 'professional') return 'Automation and growth tools for scaling teams.';
  if (slug === 'business') return 'Advanced AI, multi-location, and enterprise-ready features.';
  return '';
}

module.exports = router;
