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
  charset: 'utf8mb4',
});

/** Normalize/sanitize any shape of "features" into a clean array of strings */
function sanitizeFeatures(raw) {
  const isBad = (x) => {
    if (x === null || x === undefined) return true;
    const s = String(x).trim().toLowerCase();
    return !s || s === 'null' || s === 'undefined';
  };

  let arr;

  if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return [];
    if (s.startsWith('[')) {
      try {
        const parsed = JSON.parse(s);
        arr = Array.isArray(parsed) ? parsed : [];
      } catch {
        // fall back to CSV split
        arr = s.split(s.includes('||') ? '||' : ',');
      }
    } else {
      arr = s.split(s.includes('||') ? '||' : ',');
    }
  } else if (raw && typeof raw === 'object') {
    if (Array.isArray(raw.features)) arr = raw.features;
    else if (typeof raw.features === 'string') return sanitizeFeatures(raw.features);
    else if (typeof raw.features_csv === 'string') return sanitizeFeatures(raw.features_csv);
    else arr = [];
  } else {
    arr = [];
  }

  return arr
    .map((v) => String(v ?? '').trim().replace(/^"|"$/g, ''))
    .filter((v) => !isBad(v));
}

/**
 * GET /plans
 * Returns:
 * [
 *   { id, name, price: "19.00", slug, description, features: ["A","B","C"] }
 * ]
 */
router.get('/', async (req, res, next) => {
  try {
    // Use GROUP_CONCAT with CASE to avoid concatenating NULL/empty labels
    const sql = `
      SELECT
        p.id,
        p.name,
        p.price,
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
      price: Number(r.price ?? 0).toFixed(2),
      slug: r.slug,
      description: r.description || defaultDescription(r.slug),
      // Always send a clean **array** to the frontend
      features: sanitizeFeatures(r.features_csv),
    }));

    res.set('Cache-Control', 'public, max-age=60');
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

// Optional: GET /plans/:slug for detail pages
router.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const sql = `
      SELECT
        p.id,
        p.name,
        p.price,
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
      features: sanitizeFeatures(r.features_csv),
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
