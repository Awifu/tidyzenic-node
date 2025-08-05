(async () => {
  const API_BASE = 'https://auth.tidyzenic.com';
  const path = window.location.pathname;
  const isLoginPage = path === '/login.html' || path === '/login';

  console.log('[auth-check] Checking authentication...');

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      credentials: 'include',
    });

    if (!res.ok) {
      console.warn('[auth-check] Not authenticated (HTTP error).');

      if (!isLoginPage) {
        window.location.href = '/login.html';
      }
      return;
    }

    const { user } = await res.json();

    if (!user || !user.id) {
      console.warn('[auth-check] Invalid or missing user session.');

      if (!isLoginPage) {
        window.location.href = '/login.html';
      }
      return;
    }

    // ✅ Set user globally
    window.currentUser = user;
    console.log('[auth-check] Logged in as:', user.name || user.email);

    // ✅ Redirect from login page if already logged in
    if (isLoginPage) {
      console.log('[auth-check] Already logged in, redirecting to admin dashboard...');
      window.location.href = '/admin/admin-dashboard.html';
      return;
    }

    // ✅ Populate UI with user name if available
    const nameEl = document.getElementById('userName');
    if (nameEl) {
      nameEl.textContent = user.name || '';
    }

    // ✅ Hide admin-only sections if not an admin
    if (user.role !== 'admin') {
      document.querySelectorAll('[data-role="admin"]').forEach(el => el.remove());
    }

  } catch (err) {
    console.error('[auth-check] Request failed:', err);

    if (!isLoginPage) {
      window.location.href = '/login.html';
    }
  }
})();
