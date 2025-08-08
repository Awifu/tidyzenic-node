document.addEventListener('DOMContentLoaded', async () => {
  const inject = async (id, url) => {
    const target = document.getElementById(id);
    if (!target || target.dataset.loaded) return; // ✅ Prevent multiple loads
    try {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      target.innerHTML = await res.text();
      target.dataset.loaded = 'true';
    } catch (e) {
      console.error(`❌ Failed to load ${url}:`, e);
    }
  };

  await inject('header', '/partials/header.html');
  await inject('footer', '/partials/footer.html');
});
