// public/scripts/partials-loader.js
document.addEventListener("DOMContentLoaded", async () => {
  const loadPartial = async (selector, url) => {
    const el = document.querySelector(selector);
    if (!el) return;

    try {
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status} - ${url}`);
      const html = await res.text();
      el.innerHTML = html;
    } catch (err) {
      console.error(`❌ Failed to load partial ${url}:`, err);
      el.innerHTML = `<div style="color:red; padding:10px; text-align:center;">
        Failed to load ${url}.
      </div>`;
    }
  };

  // Load header and footer
  await Promise.all([
    loadPartial("#header", "/partials/header.html"),
    loadPartial("#footer", "/partials/footer.html")
  ]);

  console.log("✅ Partials loaded successfully");
});
