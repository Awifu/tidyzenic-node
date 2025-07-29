// public/admin/js/support-page.js

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('supportTickets');
  const adminEmailEl = document.getElementById('adminBadgeEmail');
  const searchInput = document.getElementById('ticketSearch');
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

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        const filtered = allTickets.filter(ticket =>
          ticket.subject.toLowerCase().includes(query) ||
          ticket.message.toLowerCase().includes(query) ||
          ticket.user_email.toLowerCase().includes(query)
        );
        renderTickets(filtered);
      });
    }

  } catch (err) {
    console.error('❌ Support fetch error:', err);
    container.innerHTML = '<p class="text-red-600 text-center">❌ Could not load support tickets.</p>';
  }

  function renderTickets(tickets) {
    if (tickets.length === 0) {
      container.innerHTML = '<p class="text-center text-gray-400">No matching tickets.</p>';
      return;
    }

    container.innerHTML = tickets.map(ticket => `
      <div class="bg-blue-50 border border-blue-100 p-6 rounded-2xl shadow-sm transition hover:shadow-md">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h2 class="text-lg font-semibold text-blue-800">${ticket.subject}</h2>
            <p class="text-xs text-gray-500 mt-1">${new Date(ticket.created_at).toLocaleString()}</p>
          </div>
          <span class="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
            ${ticket.status || 'Open'}
          </span>
        </div>

        <p class="text-sm text-gray-700 mb-4 editable" data-id="${ticket.id}" data-field="message">${ticket.message}</p>

        <div class="text-xs text-gray-600 mb-4">
          <strong>From:</strong> ${ticket.user_name || 'Unknown'} (${ticket.user_email || 'N/A'})
        </div>

        <div class="flex items-center justify-end space-x-3 text-sm">
          <button class="px-4 py-1 rounded-md bg-green-100 text-green-700 hover:bg-green-200 transition" onclick="openReplyModal('${ticket.id}', '${ticket.subject}', '${ticket.user_email}')">
            Reply
          </button>
          <button class="px-4 py-1 rounded-md bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition" onclick="handleMarkResolved('${ticket.id}')">
            Mark Resolved
          </button>
          <button class="px-4 py-1 rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition" onclick="handleDelete('${ticket.id}')">
            Delete
          </button>
        </div>
      </div>
    `).join('');

    // In-place editing
    document.querySelectorAll('.editable').forEach(el => {
      el.addEventListener('click', () => {
        const field = el.dataset.field;
        const id = el.dataset.id;
        const oldText = el.textContent;
        const input = document.createElement('textarea');
        input.value = oldText;
        input.className = 'w-full text-sm text-gray-800 p-2 rounded border mt-2';
        el.replaceWith(input);
        input.focus();

        input.addEventListener('blur', () => {
          const newText = input.value;
          if (newText !== oldText) {
            console.log(`Saving ${field} for ticket ${id}:`, newText);
            // TODO: Send to backend with PATCH to /api/support/:id
          }
          const newP = document.createElement('p');
          newP.className = el.className;
          newP.dataset.id = id;
          newP.dataset.field = field;
          newP.textContent = newText;
          input.replaceWith(newP);
        });
      });
    });
  }
});

// Reply modal handling
let currentReplyTicketId = null;

function openReplyModal(id, subject, email) {
  currentReplyTicketId = id;
  document.getElementById('replyModalSubject').textContent = `Subject: ${subject} | To: ${email}`;
  document.getElementById('replyMessage').value = '';
  document.getElementById('replyModal').classList.remove('hidden');
}

function closeReplyModal() {
  document.getElementById('replyModal').classList.add('hidden');
}

async function submitReply() {
  const message = document.getElementById('replyMessage').value.trim();
  if (!message) {
    alert('Reply message cannot be empty.');
    return;
  }

  try {
    const res = await fetch(`/api/support/${currentReplyTicketId}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ message })
    });

    if (!res.ok) throw new Error('Failed to send reply');
    alert('✅ Reply sent successfully.');
    closeReplyModal();
    location.reload();
  } catch (err) {
    console.error(err);
    alert('❌ Failed to send reply.');
  }
}

async function handleMarkResolved(id) {
  if (!confirm("Mark this ticket as resolved?")) return;
  try {
    const res = await fetch(`/api/support/${id}/resolve`, {
      method: 'PATCH',
      credentials: 'include'
    });
    if (!res.ok) throw new Error();
    alert('✅ Ticket marked as resolved.');
    location.reload();
  } catch {
    alert('❌ Failed to update ticket.');
  }
}

async function handleDelete(id) {
  if (!confirm("Delete this ticket permanently?")) return;
  try {
    const res = await fetch(`/api/support/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!res.ok) throw new Error();
    alert('🗑️ Ticket deleted.');
    location.reload();
  } catch {
    alert('❌ Failed to delete ticket.');
  }
}
