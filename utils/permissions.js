// utils/permissions.js

const pool = require('../db');

// Optional: simple in-memory cache to reduce DB hits
const featureCache = new Map();

/**
 * Checks if a plan has access to a specific feature key.
 * @param {number} planId - The ID of the plan
 * @param {string} featureKey - The unique feature identifier (e.g., 'ai-campaigns')
 * @returns {Promise<boolean>}
 */
async function hasFeature(planId, featureKey) {
  const cacheKey = `${planId}:${featureKey}`;
  if (featureCache.has(cacheKey)) {
    return featureCache.get(cacheKey);
  }

  const [rows] = await pool.query(`
    SELECT 1 FROM plan_features pf
    JOIN features f ON f.id = pf.feature_id
    WHERE pf.plan_id = ? AND f.feature_key = ?
    LIMIT 1
  `, [planId, featureKey]);

  const allowed = rows.length > 0;
  featureCache.set(cacheKey, allowed);
  return allowed;
}

module.exports = { hasFeature };
