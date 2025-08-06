// Placeholder data — replace with real DB queries later
exports.googleAnalytics = async (req, res) => {
  try {
    const { businessId } = req.params;

    // TODO: Replace with real DB fetch logic
    return res.json({
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      sent: [8, 10, 6, 9, 12, 4, 7],
      clicks: [3, 6, 2, 5, 8, 1, 4]
    });
  } catch (err) {
    console.error('Google Analytics Error:', err);
    res.status(500).json({ error: 'Failed to load Google review analytics' });
  }
};

exports.internalAnalytics = async (req, res) => {
  try {
    const { businessId } = req.params;

    // TODO: Replace with real DB fetch logic
    return res.json({
      labels: ['Cleaning', 'Plumbing', 'Electric'],
      ratings: [4.5, 4.0, 3.8]
    });
  } catch (err) {
    console.error('Internal Analytics Error:', err);
    res.status(500).json({ error: 'Failed to load internal review analytics' });
  }
};
