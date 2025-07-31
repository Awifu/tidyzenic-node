document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar-container');
  const backdrop = document.getElementById('sidebarBackdrop');
  const menuToggle = document.getElementById('menuToggle');

  // Toggle sidebar visibility
  function toggleSidebar(show) {
    if (show) {
      sidebar.classList.remove('hidden');
      backdrop.classList.remove('hidden');
    } else {
      sidebar.classList.add('hidden');
      backdrop.classList.add('hidden');
    }
  }

  // Mobile menu toggle button
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      const isVisible = !sidebar.classList.contains('hidden');
      toggleSidebar(!isVisible);
    });
  }

  // Close sidebar when backdrop is clicked
  if (backdrop) {
    backdrop.addEventListener('click', () => toggleSidebar(false));
  }

  // Smooth scroll to ticket list (if needed in future)
  const scrollToTickets = () => {
    const ticketSection = document.getElementById('ticket-list');
    if (ticketSection) {
      ticketSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Optionally expose for reuse
  window.supportPageUI = {
    toggleSidebar,
    scrollToTickets
  };
});
