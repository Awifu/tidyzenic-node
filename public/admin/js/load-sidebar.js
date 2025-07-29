console.log('🚀 Loading sidebar...');

fetch('/admin/sidebar.html')
  .then((res) => res.text())
  .then((html) => {
    document.getElementById('sidebar-container').innerHTML = html;

    const script = document.createElement('script');
    script.src = '/admin/js/sidebar.js';
    script.defer = true;
    document.body.appendChild(script);

    console.log('✅ Sidebar injected');

    // ⏳ Wait for currentUser from auth-check.js
    const waitForUser = setInterval(() => {
      if (window.currentUser) {
        clearInterval(waitForUser);
        const user = window.currentUser;

        // 👤 Greet user
        const nameEl = document.getElementById('sidebarUserName');
        if (nameEl) nameEl.textContent = user.name;

        // 🔐 Hide admin-only links if not admin
        if (user.role !== 'admin') {
          document.querySelectorAll('[data-role="admin"]').forEach(el => el.remove());
        }

        // 🚪 Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
          logoutBtn.addEventListener('click', () => {
            document.cookie =
              'token=; path=/; domain=.tidyzenic.com; expires=Thu, 01 Jan 1970 00:00:00 UTC; secure; sameSite=None';
            window.location.href = '/login.html';
          });
        }
      }
    }, 100); // Check every 100ms
  })
  .catch((err) => {
    console.error('❌ Sidebar load error:', err);
  });
