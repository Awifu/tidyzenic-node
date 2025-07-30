
document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('supportTickets');
  const adminEmailEl = document.getElementById('adminBadgeEmail');
  const searchInput = document.getElementById('ticketSearch');
  const toast = document.getElementById('toast');

  let allTickets = [];

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

    allTickets = tickets;

    if (tickets[0].business_email && adminEmailEl) {
      adminEmailEl.textContent = tickets[0].business_email;
    }

    renderTickets(allTickets);

    searchInput?.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase();
      const filtered = allTickets.filter(t =>
        t.subject.toLowerCase().includes(query) ||
        t.message.toLowerCase().includes(query) ||
        t.user_email.toLowerCase().includes(query)
      );
      renderTickets(filtered);
    });
  } catch (err) {
    console.error('❌ Support fetch error:', err);
    container.innerHTML = '<p class="text-red-600 text-center">❌ Could not load support tickets.</p>';
  }

  function renderTickets(tickets) {
    container.innerHTML = tickets.map(ticket => `
      <div class="ticket p-4 border rounded-lg mb-4 shadow" data-id="${ticket.id}">
        <div class="flex justify-between items-center mb-2">
          <h3 class="editable font-semibold text-blue-800" data-field="subject" data-id="${ticket.id}">${ticket.subject}</h3>
          <span class="editable px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-700" data-field="status" data-id="${ticket.id}">
            ${ticket.status}
          </span>
        </div>
        <p class="text-sm text-gray-600 mb-1">${new Date(ticket.created_at).toLocaleString()}</p>
        <p class="editable text-sm bg-gray-100 p-2 rounded" data-field="message" data-id="${ticket.id}">${ticket.message}</p>
        <div class="text-xs text-gray-500 mt-2">From: ${ticket.user_name || 'Unknown'} (${ticket.user_email})</div>
      </div>
    `).join('');
    bindEditable();
  }

  function bindEditable() {
    document.querySelectorAll('.editable').forEach(el => {
      el.addEventListener('click', () => {
        if (el.classList.contains('editing')) return;
        el.classList.add('editing');
        const field = el.dataset.field;
        const id = el.dataset.id;
        const original = el.textContent;

        const input = field === 'status' ? document.createElement('select') : document.createElement('textarea');
        if (field === 'status') {
          ['Open', 'Replied', 'Resolved'].forEach(status => {
            const option = document.createElement('option');
            option.value = option.text = status;
            if (status === original) option.selected = true;
            input.appendChild(option);
          });
        } else {
          input.value = original;
        }
        input.className = 'w-full p-2 border rounded mt-1 text-sm';
        el.replaceWith(input);
        input.focus();

        const save = async () => {
          const value = field === 'status' ? input.value : input.value.trim();
          if (!value || value === original) {
            input.replaceWith(el);
            el.classList.remove('editing');
            return;
          }

          try {
            const res = await fetch(`/api/support/${id}/edit`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ field, value })
            });
            if (!res.ok) throw new Error();
            const updatedEl = document.createElement(el.tagName.toLowerCase());
            updatedEl.className = el.className;
            updatedEl.dataset.id = id;
            updatedEl.dataset.field = field;
            updatedEl.textContent = value;
            updatedEl.classList.add('highlight-success');
            input.replaceWith(updatedEl);
            showToast('✅ Updated successfully');
            setTimeout(() => updatedEl.classList.remove('highlight-success'), 1000);
            bindEditable();
          } catch {
            showToast('❌ Update failed');
            input.replaceWith(el);
          }
        };

        input.addEventListener('blur', () => save());
        input.addEventListener('keydown', e => {
          if (e.key === 'Enter' && field !== 'status') {
            e.preventDefault();
            save();
          } else if (e.key === 'Escape') {
            input.replaceWith(el);
          }
        });
      });
    });
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('opacity-0');
    toast.classList.add('opacity-100');
    setTimeout(() => {
      toast.classList.add('opacity-0');
    }, 3000);
  }
});
