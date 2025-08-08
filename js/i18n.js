// i18n.js

// Initialize i18next with your JSON files
i18next
  .use(i18nextHttpBackend)
  .init({
    lng: getLangFromUrlOrStorage(),
    fallbackLng: 'en',
    debug: false,
    backend: {
      loadPath: '/locales/{{lng}}.json'
    }
  }, function(err, t) {
    // Init jquery-i18next
    jqueryI18next.init(i18next, $, {
      useOptionsAttr: true
    });

    // Apply translations on page load
    $('body').localize();
  });

// Get language from URL or localStorage
function getLangFromUrlOrStorage() {
  const params = new URLSearchParams(window.location.search);
  const lang = params.get('lang') || localStorage.getItem('lang') || 'en';
  localStorage.setItem('lang', lang);
  return lang;
}

// ✅ Handle clicks on language links without full page reload
$(document).on('click', 'a[href*="lang="]', function (e) {
  e.preventDefault();

  const lang = new URL(this.href).searchParams.get('lang');

  i18next.changeLanguage(lang, function () {
    $('body').localize();
    localStorage.setItem('lang', lang);
    // Optional: Update URL without reloading
    history.replaceState(null, '', `?lang=${lang}`);
  });
});
