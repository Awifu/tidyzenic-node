// public/admin/js/load-sidebar.js

fetch('/admin/sidebar.html')
  .then((res) => {
    if (!res.ok) throw new Error('Sidebar not found');
    return res.text();
  })
  .then((html) => {
    document.getElementById('sidebar-container').innerHTML = html;

    const script = document.createElement('script');
    script.src = '/admin/js/sidebar.js';
    script.defer = true;
    document.body.appendChild(script);
  })
  .catch((err) => {
    console.error('❌ Failed to load sidebar:', err);
  });
