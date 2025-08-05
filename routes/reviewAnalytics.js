const express = require('express');
const router = express.Router();
const db = require('../db');

// ============================
// GET /api/reviews/internal – List of internal reviews
// ============================
router.get('/internal', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT ir.id, ir.rating, ir.comment, ir.created_at, 
             st.id AS ticket_id, st.customer_name
      FROM internal_reviews ir
      JOIN support_tickets st ON ir.ticket_id = st.id
      ORDER BY ir.created_at DESC
    `);

    res.json({ reviews: rows });
  } catch (err) {
    console.error('❌ Error fetching internal reviews:', err);
    res.status(500).json({ error: 'Failed to fetch internal reviews' });
  }
});

module.exports = router;
