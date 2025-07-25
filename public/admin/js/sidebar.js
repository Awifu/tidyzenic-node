document.addEventListener('DOMContentLoaded', async () => {
  const bizNameEl = document.getElementById('bizName');
  const logoEl = document.getElementById('logo');

  const subdomain = window.location.hostname.split('.')[0];
  const API_BASE = location.hostname.includes('localhost')
    ? 'http://localhost:3000'
    : `https://${subdomain}.tidyzenic.com`;

  try {
    const res = await fetch(`${API_BASE}/api/business?subdomain=${subdomain}`);
    const data = await res.json();

    if (data.business_name) {
      bizNameEl.textContent = data.business_name;
    }

    if (data.logo_filename) {
      logoEl.src = `/uploads/${data.logo_filename}?v=${Date.now()}`;
      logoEl.onerror = () => {
        logoEl.src = '/assets/logo-placeholder.png';
      };
    }
  } catch (err) {
    console.error('⚠️ Failed to load business info:', err);
    bizNameEl.textContent = 'My Business';
    logoEl.src = '/assets/logo-placeholder.png';
  }
});

function logout() {
  // Future improvement: Clear token from cookie/localStorage
  window.location.href = '/login.html';
}
