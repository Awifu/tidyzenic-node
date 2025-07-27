document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('supportTickets');

  try {
    const res = await fetch('/api/support', { credentials: 'include' });

    if (!res.ok) {
      container.innerHTML = '<p class="text-red-600">Unauthorized or failed to load data.</p>';
      return;
    }

    const tickets = await res.json();

    if (!Array.isArray(tickets)) {
      container.innerHTML = '<p class="text-red-600">Failed to load support tickets.</p>';
      return;
    }

    if (tickets.length === 0) {
      container.innerHTML = '<p class="text-gray-500">No support tickets yet.</p>';
      return;
    }

    container.innerHTML = tickets.map(ticket => `
      <div class="bg-white p-4 rounded-xl shadow border">
        <h3 class="font-semibold text-blue-700">${ticket.subject}</h3>
        <p class="text-sm text-gray-500">${new Date(ticket.created_at).toLocaleString()}</p>
        <p class="mt-2 text-gray-800">${ticket.message}</p>
      </div>
    `).join('');
  } catch (error) {
    console.error('❌ Failed to fetch tickets:', error);
    container.innerHTML = '<p class="text-red-600">Error fetching support data.</p>';
  }
});
