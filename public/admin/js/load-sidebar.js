console.log('🚀 Loading sidebar...');

fetch('/admin/sidebar.html')
  .then((res) => res.text())
  .then((html) => {
    const container = document.getElementById('sidebar-container');
    container.innerHTML = html;
    console.log('✅ Sidebar injected');

    const currentPath = window.location.pathname;

    // ⬇️ Dropdown toggle for submenus with chevron rotation
    document.querySelectorAll('.dropdown-toggle').forEach(button => {
      const chevron = button.querySelector('svg');
      const menu = button.nextElementSibling;

      if (!menu || !menu.classList.contains('dropdown-menu')) return;

      button.addEventListener('click', () => {
        menu.classList.toggle('hidden');
        chevron?.classList.toggle('rotate-180');
      });
    });

    // ✅ Auto-expand submenu if current page matches any link
    document.querySelectorAll('.dropdown-menu a').forEach(link => {
      if (link.getAttribute('href') === currentPath) {
        const menu = link.closest('.dropdown-menu');
        const toggleBtn = menu?.previousElementSibling;
        const chevron = toggleBtn?.querySelector('svg');

        menu.classList.remove('hidden');
        chevron?.classList.add('rotate-180');
      }
    });

    // ✅ Highlight active nav link
    document.querySelectorAll('#sidebar-container a').forEach(link => {
      if (link.getAttribute('href') === currentPath) {
        link.classList.add('bg-gray-200', 'font-semibold', 'text-blue-700');
      }
    });

    // ✅ Responsive Mobile Sidebar Toggle
    const menuToggle = document.getElementById('menuToggle');
    const backdrop = document.getElementById('sidebarBackdrop');

    if (menuToggle && backdrop && container) {
      // Ensure sidebar has mobile-ready classes
      container.classList.add(
        'fixed', 'top-0', 'left-0', 'z-40', 'w-64', 'bg-white', 'h-full', 'overflow-y-auto',
        'transition-transform', '-translate-x-full', 'md:translate-x-0'
      );

      // Toggle open
      menuToggle.addEventListener('click', () => {
        container.classList.toggle('-translate-x-full');
        backdrop.classList.toggle('hidden');
      });

      // Toggle close
      backdrop.addEventListener('click', () => {
        container.classList.add('-translate-x-full');
        backdrop.classList.add('hidden');
      });

      // Auto-hide when resizing to desktop
      window.addEventListener('resize', () => {
        if (window.innerWidth >= 768) {
          container.classList.remove('-translate-x-full');
          backdrop.classList.add('hidden');
        }
      });
    }

    // ✅ Wait for currentUser from auth-check.js
    const waitForUser = setInterval(() => {
      if (!window.currentUser) return;
      clearInterval(waitForUser);

      const user = window.currentUser;

      const userNameEl = document.getElementById('sidebarUserName');
      if (userNameEl) userNameEl.textContent = user.name;

      // 🔐 Hide admin-only links
      if (user.role !== 'admin') {
        document.querySelectorAll('[data-role="admin"]').forEach(el => el.remove());
      }

      // 🚪 Logout
      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          document.cookie =
            'token=; path=/; domain=.tidyzenic.com; expires=Thu, 01 Jan 1970 00:00:00 UTC; secure; sameSite=None';
          window.location.href = '/login.html';
        });
      }

      // 🧠 Business Info
      fetch('/api/business/public')
        .then(res => res.json())
        .then(biz => {
          const nameEl = document.getElementById('bizName');
          const logoEl = document.getElementById('logo');

          if (nameEl && biz.business_name) {
            nameEl.textContent = biz.business_name.toUpperCase();
          }

          if (logoEl && biz.logo_filename) {
            logoEl.src = `/uploads/${biz.logo_filename}?v=${Date.now()}`;
            logoEl.onerror = () => (logoEl.src = '/assets/logo-placeholder.png');
          }
        })
        .catch(err => {
          console.warn('⚠️ Failed to fetch business info:', err);
        });
    }, 100);
  })
  .catch((err) => {
    console.error('❌ Sidebar load error:', err);
  });
