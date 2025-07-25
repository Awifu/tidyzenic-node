const express = require('express');
const router = express.Router();

// Forward the login request to /auth/login
router.post('/', (req, res, next) => {
  req.url = '/login'; // mimic subpath
  next(); // pass to next middleware (auth.js)
});

module.exports = router;
