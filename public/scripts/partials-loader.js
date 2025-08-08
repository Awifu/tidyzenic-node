// Loads /partials/header.html and /partials/footer.html into #header/#footer
document.addEventListener('DOMContentLoaded', async () => {
  const inject = async (id, url) => {
    try {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      document.getElementById(id)?.insertAdjacentHTML('beforeend', await res.text());
    } catch (e) {
      console.error(`❌ Failed to load ${url}:`, e);
    }
  };
  await inject('header', '/partials/header.html');
  await inject('footer', '/partials/footer.html');
});
