const express = require('express');
const router = express.Router();
const pool = require('../db');

// === GET /plans ===
// Get all available plans with their features
router.get('/', async (req, res) => {
  try {
    const [plans] = await pool.query('SELECT * FROM plans');
    const [features] = await pool.query('SELECT * FROM plan_features');

    const plansWithFeatures = plans.map(plan => {
      const planFeatures = features
        .filter(f => f.plan_id === plan.id)
        .map(f => f.feature_key);
      return { ...plan, features: planFeatures };
    });

    res.json(plansWithFeatures);
  } catch (err) {
    console.error('❌ Error fetching plans:', err);
    res.status(500).json({ error: 'Failed to load plans' });
  }
});

// === GET /plans/:id ===
// Get a specific plan and its features
router.get('/:id', async (req, res) => {
  const planId = parseInt(req.params.id);
  if (isNaN(planId)) {
    return res.status(400).json({ error: 'Invalid plan ID' });
  }

  try {
    const [plans] = await pool.query('SELECT * FROM plans WHERE id = ?', [planId]);
    if (!plans.length) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const [features] = await pool.query(
      'SELECT feature_key FROM plan_features WHERE plan_id = ?',
      [planId]
    );

    res.json({
      ...plans[0],
      features: features.map(f => f.feature_key)
    });
  } catch (err) {
    console.error('❌ Error fetching plan details:', err);
    res.status(500).json({ error: 'Failed to load plan details' });
  }
});

module.exports = router;
