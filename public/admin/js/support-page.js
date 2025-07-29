document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('supportTickets');
  const badgeEmail = document.getElementById('adminBadgeEmail');
  const badgeName = document.getElementById('adminBadgeName');

  try {
    const res = await fetch('/api/support', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch tickets');
    const tickets = await res.json();

    if (!Array.isArray(tickets)) {
      container.innerHTML = '<p class="text-red-600">Invalid response format.</p>';
      return;
    }

    if (tickets.length === 0) {
      container.innerHTML = '<p class="text-center text-gray-400">No support tickets yet.</p>';
      return;
    }

    // Use the first ticket to extract business email
    if (tickets[0]?.business_email) badgeEmail.textContent = tickets[0].business_email;
    if (window.currentUser?.name) badgeName.textContent = window.currentUser.name;

    container.innerHTML = tickets.map(ticket => `
      <div class="bg-white/10 backdrop-blur border border-white/10 p-5 rounded-xl shadow-lg">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-blue-300">${ticket.subject}</h3>
          <p class="text-sm text-gray-400">${new Date(ticket.created_at).toLocaleString()}</p>
        </div>
        <p class="mt-2 text-sm text-gray-300">${ticket.message}</p>
        <div class="mt-3 text-xs text-gray-400">
          <span>From: ${ticket.user_name} (${ticket.user_email})</span>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('❌ Support fetch error:', err);
    container.innerHTML = '<p class="text-red-600">Could not load support tickets.</p>';
  }
});
