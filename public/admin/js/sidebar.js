// public/admin/js/sidebar.js

(async () => {
  const bizNameEl = document.getElementById('bizName');
  const logoEl = document.getElementById('logo');
  const toggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');

  // Load branding
  try {
    const res = await fetch('/api/business/public');
    const data = await res.json();

    if (data.business_name && bizNameEl)
      bizNameEl.textContent = data.business_name.toUpperCase();

    if (data.logo_filename && logoEl) {
      logoEl.src = `/uploads/${data.logo_filename}?v=${Date.now()}`;
      logoEl.onerror = () => (logoEl.src = '/assets/logo-placeholder.png');
    }
  } catch (err) {
    if (bizNameEl) bizNameEl.textContent = 'Your Business';
    if (logoEl) logoEl.src = '/assets/logo-placeholder.png';
  }

  // Open sidebar (mobile)
  toggle?.addEventListener('click', () => {
    sidebar?.classList.remove('-translate-x-full');
    backdrop?.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  });

  // Close sidebar
  backdrop?.addEventListener('click', () => {
    sidebar?.classList.add('-translate-x-full');
    backdrop?.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  });

  // Scroll inside sidebar
  sidebar?.classList.add('overflow-y-auto');

  // Dropdown toggles
  document.querySelectorAll('.dropdown-toggle').forEach(button => {
    button.addEventListener('click', () => {
      const menu = button.nextElementSibling;
      const icon = button.querySelector('svg');

      if (menu?.classList.contains('dropdown-menu')) {
        menu.classList.toggle('hidden');
        icon?.classList.toggle('rotate-180');
      }
    });
  });
})();
