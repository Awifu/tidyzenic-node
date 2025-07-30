document.addEventListener('DOMContentLoaded', async () => {
  const hostname = window.location.hostname;
  if (hostname !== 'tidyzenic.com' && hostname !== 'www.tidyzenic.com') {
    window.location.href = 'https://tidyzenic.com/login.html';
    return;
  }

  try {
    const res = await fetch('/auth/me', { credentials: 'include' });
    if (res.ok) {
      const { user } = await res.json();
      window.location.href = '/admin/dashboard.html';
    }
  } catch (err) {
    if (!(err?.response?.status === 401)) {
      console.warn('Error checking login:', err);
    }
  }
});
