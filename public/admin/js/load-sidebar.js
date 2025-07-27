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
  })
  .catch((err) => {
    console.error('❌ Sidebar load error:', err);
  });
