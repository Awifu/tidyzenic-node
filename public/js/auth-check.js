(async () => {
  const API_BASE = 'https://auth.tidyzenic.com';
  const isLoginPage = window.location.pathname.includes('/login');

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      credentials: 'include',
    });

    if (!res.ok) {
      // Not logged in
      if (!isLoginPage) {
        window.location.href = '/login.html';
      }
      return;
    }

    const { user } = await res.json();

    if (!user || !user.id) {
      // Malformed user object
      if (!isLoginPage) {
        window.location.href = '/login.html';
      }
      return;
    }

    // ✅ Set globally
    window.currentUser = user;

    // ✅ Already logged in, redirect from login page
    if (isLoginPage) {
      window.location.href = '/admin/admin-dashboard.html';
      return;
    }

    // ✅ Populate UI if available
    const nameEl = document.getElementById('userName');
    if (nameEl) {
      nameEl.textContent = user.name;
    }

    // ✅ Hide admin-only sections for non-admins
    if (user.role !== 'admin') {
      document.querySelectorAll('[data-role="admin"]').forEach(el => el.remove());
    }

  } catch (err) {
    console.error('❌ Auth check failed:', err);
    if (!isLoginPage) {
      window.location.href = '/login.html';
    }
  }
})();
