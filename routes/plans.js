// routes/plans.js
const express = require('express');
const mysql = require('mysql2/promise');
const router = express.Router();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  connectionLimit: 10,
});

router.get('/', async (req, res, next) => {
  try {
    // 1) Plans
    const [plans] = await pool.query(
      `SELECT id, slug, name, badge, popular, currency
         FROM plans
        WHERE active = 1
        ORDER BY sort_order, id`
    );
    if (!plans.length) return res.json([]);

    const planIds = plans.map(p => p.id);

    // 2) Prices
    const [prices] = await pool.query(
      `SELECT plan_id, \`interval\`, amount_cents, note
         FROM plan_prices
        WHERE plan_id IN (${planIds.map(()=>'?').join(',')})`,
      planIds
    );

    // 3) Features (filter blanks at SQL level)
    const [features] = await pool.query(
      `SELECT plan_id, feature
         FROM plan_features
        WHERE plan_id IN (${planIds.map(()=>'?').join(',')})
          AND feature IS NOT NULL
          AND TRIM(feature) <> ''
        ORDER BY sort_order, id`,
      planIds
    );

    // 4) Shape
    const byPlan = Object.fromEntries(
      plans.map(p => [p.id, {
        id: p.slug, // expose slug as stable id
        name: p.name,
        badge: p.badge || null,
        popular: !!p.popular,
        currency: p.currency || 'USD',
        monthly: { price: null, note: null },
        annual:  { price: null, note: null },
        features: [],
        cta: { label: (p.badge || '').toLowerCase() === 'contact sales' ? 'Contact sales' : 'Start free trial' },
      }])
    );

    for (const pr of prices) {
      const dest = byPlan[pr.plan_id];
      if (!dest) continue;
      const amount = pr.amount_cents != null ? Math.round(pr.amount_cents) / 100 : null;
      const note = pr.note || null;
      if (pr.interval === 'monthly') {
        dest.monthly = { price: amount, note };
      } else if (pr.interval === 'annual') {
        dest.annual = { price: amount, note };
      }
    }

    for (const f of features) {
      const dest = byPlan[f.plan_id];
      if (!dest) continue;
      dest.features.push(f.feature);
    }

    res.json(Object.values(byPlan));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
