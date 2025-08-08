// Step 1: Fetch preferred language from backend
async function getPreferredLanguage() {
  try {
    const res = await fetch('/api/business/preferences');
    if (!res.ok) throw new Error('Failed to load preference');
    const data = await res.json();
    return data.preferred_language || 'en';
  } catch (err) {
    console.error('[i18n] Failed to fetch preferred language:', err);
    return 'en';
  }
}

// Step 2: Initialize i18n using preferred language or localStorage
getPreferredLanguage().then((preferredLanguage) => {
  const storedLang = localStorage.getItem('lang');
  const lang = storedLang || preferredLanguage;

  i18next
    .use(i18nextHttpBackend)
    .init({
      lng: lang,
      fallbackLng: 'en',
      debug: true,
      backend: {
        loadPath: '/locales/{{lng}}.json'
      }
    }, function(err, t) {
      jqueryI18next.init(i18next, $, {
        tName: 't',
        i18nName: 'i18n',
        handleName: 'localize',
        selectorAttr: 'data-i18n',
        useOptionsAttr: true,
        parseDefaultValueFromContent: true
      });

      $('body').localize();
    });

  // Step 3: On-click switch updates both localStorage and UI
  $(document).on('click', 'a[href*="lang="]', function (e) {
    e.preventDefault();
    const newLang = new URL(this.href).searchParams.get('lang');
    i18next.changeLanguage(newLang, function () {
      $('body').localize();
      localStorage.setItem('lang', newLang);
    });
  });
});
