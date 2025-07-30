document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar-container');
  const backdrop = document.getElementById('sidebarBackdrop');

  menuToggle?.addEventListener('click', () => {
    sidebar.classList.remove('-translate-x-full'); // show sidebar
    backdrop.classList.remove('hidden');           // show backdrop
  });

  backdrop?.addEventListener('click', () => {
    sidebar.classList.add('-translate-x-full');    // hide sidebar
    backdrop.classList.add('hidden');              // hide backdrop
  });
});
