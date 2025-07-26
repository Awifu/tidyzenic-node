document.addEventListener('DOMContentLoaded', async () => {
  const bizNameEl = document.getElementById('bizName');
  const logoEl = document.getElementById('logo');
  const toggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');

  // 🔄 Fetch business info using backend's tenantResolver
  try {
    const res = await fetch('/api/business', { credentials: 'include' });
    const data = await res.json();

    console.log('✅ Business data loaded:', data);

    if (data.business_name && bizNameEl) {
      bizNameEl.textContent = data.business_name.toUpperCase();
    }

    if (data.logo_filename && logoEl) {
      const logoPath = `/uploads/${data.logo_filename}?v=${Date.now()}`;
      console.log('🖼️ Logo URL:', logoPath);
      logoEl.src = logoPath;

      logoEl.onerror = () => {
        console.warn('⚠️ Logo failed to load, using fallback.');
        logoEl.src = '/assets/logo-placeholder.png';
      };
    } else if (logoEl) {
      logoEl.src = '/assets/logo-placeholder.png';
    }
  } catch (error) {
    console.error('❌ Failed to fetch business info:', error);
    if (bizNameEl) bizNameEl.textContent = 'Your Business';
    if (logoEl) logoEl.src = '/assets/logo-placeholder.png';
  }

  // 📱 Mobile sidebar toggle
  toggle?.addEventListener('click', () => {
    sidebar?.classList.remove('-translate-x-full');
    backdrop?.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  });

  // ✖️ Backdrop click to close sidebar
  backdrop?.addEventListener('click', () => {
    sidebar?.classList.add('-translate-x-full');
    backdrop?.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  });
});

// 🔐 Logout redirection
function logout() {
  // In production: also clear auth token or session
  window.location.href = '/login.html';
}
