// public/admin/js/translation.js

async function loadTranslations() {
  try {
    const res = await fetch('/admin/translation/api');
    const data = await res.json();
    window.translations = data.translations || {};
    window.currentLang = data.lang || 'en';
  } catch (error) {
    console.error('Failed to load translations:', error);
  }
}

// Usage helper
function t(key) {
  return window.translations?.[key] || key;
}

// Example: Update UI elements
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translated = t(key);
    if (translated) el.textContent = translated;
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadTranslations();
  applyTranslations();
});
