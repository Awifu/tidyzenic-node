// public/js/auth-check.js

(async () => {
  const API_BASE = window.location.origin; // ✅ Use current subdomain for cookie-based auth

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      credentials: 'include'
    });

    if (!res.ok) {
      // Not authenticated — redirect to login
      window.location.href = '/login.html';
      return;
    }

    const { user } = await res.json();

    // ✅ Store user info globally (optional)
    window.currentUser = user;

    // ✅ Show user's name in UI if element exists
    const nameEl = document.getElementById('userName');
    if (nameEl) {
      nameEl.textContent = user.name;
    }

    // ✅ Role-based access: remove admin-only elements for non-admins
    if (user.role !== 'admin') {
      document.querySelectorAll('[data-role="admin"]').forEach(el => el.remove());
    }

  } catch (err) {
    console.error('❌ Auth check failed:', err);
    window.location.href = '/login.html';
  }
})();
