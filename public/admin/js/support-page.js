// public/admin/js/support-page.js

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('supportTickets');
  const adminEmailEl = document.getElementById('adminBadgeEmail');

  // Set loading state with light-theme friendly text color
  container.innerHTML = `<p class="text-gray-500 text-center">Loading tickets...</p>`;

  try {
    const res = await fetch('/api/support', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch tickets');
    const tickets = await res.json();

    if (!Array.isArray(tickets)) {
      container.innerHTML = '<p class="text-red-600 text-center">❌ Invalid response format.</p>';
      return;
    }

    if (tickets.length === 0) {
      container.innerHTML = '<p class="text-center text-gray-500">No support tickets found.</p>';
      return;
    }

    // Inject admin business email from the first ticket
    if (tickets[0].business_email && adminEmailEl) {
      adminEmailEl.textContent = tickets[0].business_email;
    }

    // Build cards (light theme)
    container.innerHTML = tickets.map(ticket => `
      <div class="bg-white border border-gray-200 p-6 rounded-xl shadow transition hover:shadow-lg">
        <div class="flex justify-between items-center mb-2">
          <h2 class="text-lg font-semibold text-blue-700">${ticket.subject}</h2>
          <span class="text-xs text-gray-500">${new Date(ticket.created_at).toLocaleString()}</span>
        </div>
        <p class="text-sm text-gray-700 mb-3">${ticket.message}</p>
        <div class="text-xs text-gray-600">
          <strong>From:</strong> ${ticket.user_name || 'Unknown'} (${ticket.user_email || 'N/A'})
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('❌ Support fetch error:', err);
    container.innerHTML = '<p class="text-red-600 text-center">❌ Could not load support tickets.</p>';
  }
});
