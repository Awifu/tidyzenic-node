// routes/plans.js
const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');

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

const PROD = process.env.NODE_ENV === 'production';

/** Turn whatever the DB gives (CSV/JSON/array) into a clean string[] */
function sanitizeFeatures(raw, planSlugForLogs = '') {
  const isBad = (x) => {
    if (x === null || x === undefined) return true;
    const s = String(x).trim().toLowerCase();
    return !s || s === 'null' || s === 'undefined';
  };

  let arr = [];

  if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) arr = [];
    else if (s.startsWith('[')) {
      try {
        const parsed = JSON.parse(s);
        arr = Array.isArray(parsed) ? parsed : [];
      } catch {
        arr = s.split(s.includes('||') ? '||' : ',');
      }
    } else {
      arr = s.split(s.includes('||') ? '||' : ',');
    }
  } else if (raw && typeof raw === 'object') {
    if (Array.isArray(raw.features)) arr = raw.features;
    else if (typeof raw.features === 'string') return sanitizeFeatures(raw.features, planSlugForLogs);
    else if (typeof raw.features_csv === 'string') return sanitizeFeatures(raw.features_csv, planSlugForLogs);
  }

  const before = arr.slice();
  const cleaned = arr
    .map(v => String(v ?? '').trim().replace(/^"|"$/g, ''))
    .filter(v => !isBad(v));

  if (!PROD && before.length && cleaned.length < before.length) {
    console.warn(`plans: sanitized ${before.length - cleaned.length} bad feature token(s) for plan "${planSlugForLogs}"`);
  }

  return cleaned;
}

const BASE_SELECT = `
  SELECT
    p.id,
    p.name,
    p.price,
    p.slug,
    p.description,
    /* CSV only: GROUP_CONCAT naturally skips SQL NULLs */
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
`;

/**
 * GET /plans  -> [{ id, name, price:"00.00", slug, description, features: string[] }]
 */
router.get('/', async (req, res, next) => {
  try {
    const sql = `
      ${BASE_SELECT}
      GROUP BY p.id
      ORDER BY p.price ASC, p.name ASC
    `;
    const [rows] = await pool.query(sql);

    const payload = rows.map(r => ({
      id: r.id,
      name: r.name,
      price: Number(r.price ?? 0).toFixed(2),
      slug: r.slug,
      description: r.description || defaultDescription(r.slug),
      features: sanitizeFeatures(r.features_csv, r.slug),
    }));

    res.set('Cache-Control', 'public, max-age=60');
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /plans/:slug  -> { ...single plan... }
 */
router.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const sql = `
      ${BASE_SELECT}
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
      features: sanitizeFeatures(r.features_csv, r.slug),
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
