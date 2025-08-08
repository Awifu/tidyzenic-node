// /middleware/loadTranslation.js
const path = require('path');
const fs = require('fs');

module.exports = function loadTranslation(req, res, next) {
  const lang = req.session?.language || 'en'; // default to English
  const translationsDir = path.join(__dirname, '..', 'locales');
  const translationFile = path.join(translationsDir, `${lang}.json`);

  try {
    if (fs.existsSync(translationFile)) {
      const rawData = fs.readFileSync(translationFile);
      res.locals.t = JSON.parse(rawData); // this will be accessible in templates
    } else {
      console.warn(`⚠️ Translation file not found for lang: ${lang}`);
      res.locals.t = {}; // fallback to empty translations
    }
  } catch (err) {
    console.error(`❌ Failed to load translations for ${lang}:`, err);
    res.locals.t = {};
  }

  next();
};
