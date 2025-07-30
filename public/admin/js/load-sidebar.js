console.log('🚀 Loading sidebar...');

fetch('/admin/sidebar.html')
  .then(res => res.text())
  .then(html => {
    const temp = document.createElement('div');
    temp.innerHTML = html.trim();

    const newSidebar = temp.querySelector('#sidebar-container');
    const existingSidebar = document.getElementById('sidebar-container');

    if (newSidebar && existingSidebar) {
      existingSidebar.replaceWith(newSidebar);
    }

    const script = document.createElement('script');
    script.src = '/admin/js/sidebar.js';
    script.defer = true;
    document.body.appendChild(script);

    console.log('✅ Sidebar injected');

    const waitForUser = setInterval(() => {
      if (!window.currentUser) return;
      clearInterval(waitForUser);

      const user = window.currentUser;

      const userNameEl = document.getElementById('sidebarUserName');
      if (userNameEl) userNameEl.textContent = user.name;

      if (user.role !== 'admin') {
        document.querySelectorAll('[data-role="admin"]').forEach(el => el.remove());
      }

      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          document.cookie =
            'token=; path=/; domain=.tidyzenic.com; expires=Thu, 01 Jan 1970 00:00:00 UTC; secure; sameSite=None';
          window.location.href = '/login.html';
        });
      }

      fetch('/api/business/public')
        .then(res => res.json())
        .then(biz => {
          const nameEl = document.getElementById('bizName');
          const logoEl = document.getElementById('logo');

          if (nameEl && biz.business_name) {
            nameEl.textContent = biz.business_name;
          }
          if (logoEl && biz.logo_filename) {
            logoEl.src = `/uploads/logos/${biz.logo_filename}`;
          }
        })
        .catch(err => {
          console.warn('⚠️ Failed to fetch business info:', err);
        });
    }, 100);
  })
  .catch(err => {
    console.error('❌ Sidebar load error:', err);
  });
