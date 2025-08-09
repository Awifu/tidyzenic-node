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
    // Fetch active plans in display order
    const [plans] = await pool.query(
      `SELECT id, slug, name, badge, popular, currency
         FROM plans
        WHERE active = 1
        ORDER BY sort_order, id`
    );

    if (plans.length === 0) return res.json([]);

    // Fetch prices (monthly + annual)
    const planIds = plans.map(p => p.id);
    const [prices] = await pool.query(
      `SELECT plan_id, \`interval\`, amount_cents, note
         FROM plan_prices
        WHERE plan_id IN (${planIds.map(()=>'?').join(',')})`,
      planIds
    );

    // Fetch features
    const [features] = await pool.query(
      `SELECT plan_id, feature
         FROM plan_features
        WHERE plan_id IN (${planIds.map(()=>'?').join(',')})
        ORDER BY sort_order, id`,
      planIds
    );

    // Shape into frontend format
    const byPlan = Object.fromEntries(plans.map(p => [p.id, {
      id: p.slug,                    // we expose slug as stable id
      name: p.name,
      badge: p.badge,
      popular: !!p.popular,
      currency: p.currency || 'USD',
      monthly: { price: null, note: null },
      annual:  { price: null, note: null },
      features: [],
      cta: { label: p.badge === 'Contact sales' ? 'Contact sales' : 'Start free trial' },
    }]));

    for (const pr of prices) {
      const dest = byPlan[pr.plan_id];
      if (!dest) continue;
      const amount = Math.round(pr.amount_cents) / 100;
      if (pr.interval === 'monthly') {
        dest.monthly.price = amount;
        dest.monthly.note = pr.note || null;
      } else if (pr.interval === 'annual') {
        dest.annual.price = amount;
        dest.annual.note = pr.note || null;
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
