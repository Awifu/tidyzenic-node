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
    if (!tickets.length) {
      container.innerHTML = '<p class="text-center text-gray-400">No matching tickets.</p>';
      return;
    }

    container.innerHTML = tickets.map(ticket => `
      <div class="ticket bg-blue-50 border border-blue-100 p-6 rounded-2xl shadow-sm hover:shadow-md" data-id="${ticket.id}">
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
          <button class="replyBtn px-4 py-1 rounded-md bg-green-100 text-green-700 hover:bg-green-200"
                  data-id="${ticket.id}" 
                  data-subject="${encodeURIComponent(ticket.subject)}"
                  data-email="${encodeURIComponent(ticket.user_email)}">
            Reply
          </button>

          <button class="resolveBtn px-4 py-1 rounded-md bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                  data-id="${ticket.id}">
            Mark Resolved
          </button>

          <button class="deleteBtn px-4 py-1 rounded-md bg-red-100 text-red-700 hover:bg-red-200"
                  data-id="${ticket.id}">
            Delete
          </button>
        </div>
      </div>
    `).join('');

    bindActions();
    bindInPlaceEditing();
  }

  function bindActions() {
    document.querySelectorAll('.replyBtn').forEach(btn =>
      btn.addEventListener('click', () => {
        const { id, subject, email } = btn.dataset;
        openReplyModal(id, decodeURIComponent(subject), decodeURIComponent(email));
      })
    );

    document.querySelectorAll('.resolveBtn').forEach(btn =>
      btn.addEventListener('click', () => handleMarkResolved(btn.dataset.id))
    );

    document.querySelectorAll('.deleteBtn').forEach(btn =>
      btn.addEventListener('click', () => handleDelete(btn.dataset.id))
    );
  }

  function bindInPlaceEditing() {
    document.querySelectorAll('.editable').forEach(el => {
      el.addEventListener('click', () => {
        const { field, id } = el.dataset;
        const oldText = el.textContent;
        const textarea = document.createElement('textarea');

        textarea.value = oldText;
        textarea.className = 'w-full text-sm text-gray-800 p-2 rounded border mt-2';
        el.replaceWith(textarea);
        textarea.focus();

        textarea.addEventListener('blur', async () => {
          const newText = textarea.value;
          const updatedEl = document.createElement('p');

          updatedEl.className = el.className;
          updatedEl.dataset.id = id;
          updatedEl.dataset.field = field;
          updatedEl.textContent = newText;

          textarea.replaceWith(updatedEl);
          bindInPlaceEditing();

          if (newText !== oldText) {
            console.log(`📝 Updating ${field} for ticket ${id}...`);
            // Optional: Send to backend here
          }
        });
      });
    });
  }
});

// Modal & Button Handling
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
  if (!message) return alert('Reply message cannot be empty.');

  try {
    const res = await fetch(`/api/support/${currentReplyTicketId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ message }),
    });

    if (!res.ok) throw new Error();
    alert('✅ Reply sent');
    closeReplyModal();
    location.reload();
  } catch {
    alert('❌ Failed to send reply');
  }
}

async function handleMarkResolved(id) {
  if (!confirm('Mark this ticket as resolved?')) return;
  try {
    const res = await fetch(`/api/support/${id}/resolve`, {
      method: 'PATCH',
      credentials: 'include',
    });
    if (!res.ok) throw new Error();
    alert('✅ Ticket marked as resolved');
    location.reload();
  } catch {
    alert('❌ Failed to resolve ticket');
  }
}

async function handleDelete(id) {
  if (!confirm('Delete this ticket permanently?')) return;
  try {
    const res = await fetch(`/api/support/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error();
    alert('🗑️ Ticket deleted');
    location.reload();
  } catch {
    alert('❌ Failed to delete ticket');
  }
}

// Bind modal buttons safely
document.getElementById('closeReplyBtn')?.addEventListener('click', closeReplyModal);
document.getElementById('submitReplyBtn')?.addEventListener('click', submitReply);
