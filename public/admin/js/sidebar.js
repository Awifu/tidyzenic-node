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

  // 🟢 Mobile: open sidebar
  toggle?.addEventListener('click', () => {
    sidebar?.classList.remove('-translate-x-full');
    backdrop?.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  });

  // 🔴 Mobile: close sidebar
  backdrop?.addEventListener('click', () => {
    sidebar?.classList.add('-translate-x-full');
    backdrop?.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  });

  // Enable scroll inside sidebar
  sidebar?.classList.add('overflow-y-auto');

  // ⬇️ Dropdown toggle behavior
  document.querySelectorAll('.dropdown-toggle').forEach(button => {
    const icon = button.querySelector('svg');
    const menu = button.nextElementSibling;

    button.addEventListener('click', () => {
      if (!menu?.classList.contains('dropdown-menu')) return;

      menu.classList.toggle('hidden');
      icon?.classList.toggle('rotate-180');
    });
  });

  // 🔄 Auto-expand dropdown if current URL matches submenu
  const currentUrl = window.location.pathname;
  document.querySelectorAll('.dropdown-menu a').forEach(link => {
    if (link.getAttribute('href') === currentUrl) {
      const menu = link.closest('.dropdown-menu');
      const toggleBtn = menu?.previousElementSibling;
      const icon = toggleBtn?.querySelector('svg');

      menu?.classList.remove('hidden');
      icon?.classList.add('rotate-180');
    }
  });
})();
