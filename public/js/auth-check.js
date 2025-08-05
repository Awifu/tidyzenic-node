(async () => {
  const API_BASE = 'https://auth.tidyzenic.com';
  const path = window.location.pathname;
  const isLoginPage = path === '/login.html' || path === '/login';

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      credentials: 'include',
    });

    if (!res.ok) {
      // User is not logged in
      if (!isLoginPage) {
        window.location.href = '/login.html';
      }
      return;
    }

    const { user } = await res.json();

    if (!user || !user.id) {
      // Invalid session or malformed user
      if (!isLoginPage) {
        window.location.href = '/login.html';
      }
      return;
    }

    // ✅ Set user globally
    window.currentUser = user;

    // ✅ If already logged in and on login page, go to dashboard
    if (isLoginPage) {
      window.location.href = '/admin/dashboard.html';
      return;
    }

    // ✅ Update UI with user name
    const nameEl = document.getElementById('userName');
    if (nameEl) {
      nameEl.textContent = user.name || '';
    }

    // ✅ Hide admin-only elements if not an admin
    if (user.role !== 'admin') {
      document.querySelectorAll('[data-role="admin"]').forEach(el => el.remove());
    }

  } catch (err) {
    console.error('❌ Auth check failed:', err);

    // Redirect to login only if not already there
    if (!isLoginPage) {
      window.location.href = '/login.html';
    }
  }
})();
