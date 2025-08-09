// public/scripts/partials-loader.js
(() => {
  const loadPartial = async (selector, url) => {
    const mount = document.querySelector(selector);
    if (!mount) return;

    try {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      mount.innerHTML = html;
    } catch (err) {
      console.warn(`Failed to load partial ${url}:`, err);
      mount.innerHTML = `
        <div class="bg-white border-b border-gray-200">
          <div class="max-w-6xl mx-auto px-4 py-3 text-sm text-gray-600"></div>
        </div>`;
    }
  };

  const init = () => {
    loadPartial('#header', '/partials/header.html?v=3');
    loadPartial('#footer', '/partials/footer.html?v=3');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
