const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const bearer = req.headers.authorization;
  const token =
    req.cookies.token ||
    (bearer && bearer.startsWith('Bearer ') ? bearer.split(' ')[1] : null);

  if (!token) {
    return res.status(401).json({ error: 'Missing auth token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.warn('❌ Invalid token:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
