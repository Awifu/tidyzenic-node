i18next
  .use(i18nextHttpBackend)
  .init({
    lng: localStorage.getItem('lang') || 'en',
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

$(document).on('click', 'a[href*="lang="]', function (e) {
  e.preventDefault();
  const lang = new URL(this.href).searchParams.get('lang');
  i18next.changeLanguage(lang, function () {
    $('body').localize();
    localStorage.setItem('lang', lang);
  });
});
