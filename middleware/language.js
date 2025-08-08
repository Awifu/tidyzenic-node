// middleware/language.js
const fs = require('fs');
const path = require('path');

const defaultLang = 'en';

module.exports = (req, res, next) => {
  const lang = req.cookies.lang || defaultLang;

  try {
    const filePath = path.join(__dirname, '..', 'locales', `${lang}.json`);
    const raw = fs.readFileSync(filePath, 'utf8');
    const translations = JSON.parse(raw);

    req.translations = translations;
    res.locals.translations = translations; // Optional: For EJS or other views
  } catch (err) {
    console.warn(`🌐 Language file not found or error loading ${lang}.json`, err);
    req.translations = {};
  }

  next();
};
