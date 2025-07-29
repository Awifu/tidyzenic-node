// public/admin/js/support-page.js

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('supportTickets');
  const nameEl = document.getElementById('adminName');
  const emailEl = document.getElementById('adminEmail');
  const initialEl = document.getElementById('adminInitial');

  try {
    const res = await fetch('/api/support', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch tickets');

    const tickets = await res.json();
    if (!Array.isArray(tickets)) {
      container.innerHTML = '<p class="text-red-600">Invalid ticket data.</p>';
      return;
    }

    if (tickets.length === 0) {
      container.innerHTML = '<p class="text-center text-gray-500">No support tickets yet.</p>';
      return;
    }

    container.innerHTML = tickets.map(ticket => {
      const date = new Date(ticket.created_at).toLocaleString();
      const senderName = ticket.user_name || 'Unknown';
      const senderEmail = ticket.user_email || 'N/A';

      return `
        <div class="bg-white p-5 rounded-xl border shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-lg font-semibold text-blue-700">${ticket.subject}</h3>
            <span class="text-xs text-gray-400">${date}</span>
          </div>
          <p class="text-sm text-gray-800 mb-2 whitespace-pre-wrap">${ticket.message}</p>
          <div class="text-xs text-gray-500">
            From: <span class="font-medium">${senderName}</span> &lt;${senderEmail}&gt;
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('❌ Support fetch error:', err);
    container.innerHTML = '<p class="text-red-600">Could not load support tickets.</p>';
  }

  // Load current admin user info from global
  const user = window.currentUser;
  if (user) {
    if (nameEl) nameEl.textContent = user.name || 'Admin';
    if (emailEl) emailEl.textContent = user.email || 'admin@tidyzenic.com';
    if (initialEl) initialEl.textContent = (user.name || 'A')[0].toUpperCase();
  }
});
