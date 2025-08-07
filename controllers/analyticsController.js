const db = require('../db');

exports.googleAnalytics = async (req, res) => {
  try {
    const { businessId } = req.params;

    const [rows] = await db.execute(
      `SELECT rating AS label, COUNT(*) AS count
       FROM google_reviews
       WHERE business_id = ?
       GROUP BY rating
       ORDER BY rating DESC`,
      [businessId]
    );

    const analytics = rows.map((r) => ({
      label: `${r.label} Stars`,
      count: r.count,
    }));

    res.json({ analytics });
  } catch (err) {
    console.error('❌ Google Analytics Error:', err);
    res.status(500).json({ error: 'Failed to load Google review analytics' });
  }
};

exports.internalAnalytics = async (req, res) => {
  try {
    const { businessId } = req.params;

    const [rows] = await db.execute(
      `SELECT s.name AS service_name, AVG(r.rating) AS avg_rating
       FROM internal_reviews r
       JOIN service_orders o ON r.ticket_id = o.id
       JOIN services s ON o.service_id = s.id
       WHERE o.business_id = ?
       GROUP BY s.name
       ORDER BY avg_rating DESC`,
      [businessId]
    );

    const labels = rows.map((row) => row.service_name);
    const ratings = rows.map((row) => parseFloat(row.avg_rating.toFixed(2)));

    res.json({ labels, ratings });
  } catch (err) {
    console.error('❌ Internal Analytics Error:', err);
    res.status(500).json({ error: 'Failed to load internal review analytics' });
  }
};
