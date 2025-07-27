// public/admin/js/load-sidebar.js

fetch('/admin/sidebar.html')
  .then(response => {
    if (!response.ok) throw new Error('Sidebar not found');
    return response.text();
  })
  .then(html => {
    document.getElementById('sidebar-container').innerHTML = html;

    // Dynamically load sidebar behavior JS
    const script = document.createElement('script');
    script.src = '/admin/js/sidebar.js';
    script.defer = true;
    document.body.appendChild(script);
  })
  .catch(error => {
    console.error('❌ Failed to load sidebar:', error);
  });
