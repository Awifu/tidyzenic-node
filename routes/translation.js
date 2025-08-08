// routes/translation.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  const { lang } = req.query;

  const supportedLangs = ['en', 'fr', 'es', 'pt', 'de', 'nl'];

  if (lang && supportedLangs.includes(lang)) {
    res.cookie('lang', lang, {
      httpOnly: false,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: 'lax',
    });

    // Redirect back to dashboard or referer
    const referer = req.get('referer');
    return res.redirect(referer || '/admin/dashboard');
  }

  return res.status(400).send('Invalid language code.');
});
// routes/translation.js (append to same file)
router.get('/api', (req, res) => {
  const lang = req.cookies.lang || 'en';
  res.json({
    lang,
    translations: req.translations || {},
  });
});

module.exports = router;
