document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('supportTickets');
  const adminEmailEl = document.getElementById('adminBadgeEmail');
  const searchInput = document.getElementById('ticketSearch');
  const closeReplyBtn = document.getElementById('closeReplyBtn');
  const submitReplyBtn = document.getElementById('submitReplyBtn');
  const replyModal = document.getElementById('replyModal');
  const replyModalSubject = document.getElementById('replyModalSubject');
  const replyMessage = document.getElementById('replyMessage');
  const replyError = document.getElementById('replyError');
  const toast = document.getElementById('toast');

  let allTickets = [];
  let currentReplyTicketId = null;

  init();

  async function init() {
    container.innerHTML = `<p class="text-gray-500 text-center">Loading tickets...</p>`;

    try {
      const res = await fetch('/api/support', { credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to fetch tickets (${res.status})`);

      const tickets = await res.json();
      if (!Array.isArray(tickets)) throw new Error('Invalid response format');

      allTickets = tickets;

      if (tickets.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">No support tickets found.</p>';
        return;
      }

      if (adminEmailEl && tickets[0].business_email) {
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
  }

  function escapeHTML(str = '') {
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag]));
  }

  function renderTickets(tickets) {
    if (!tickets.length) {
      container.innerHTML = '<p class="text-center text-gray-400">No matching tickets.</p>';
      return;
    }

    container.innerHTML = tickets.map(ticket => `
      <div class="ticket bg-white border border-gray-200 p-6 rounded-2xl shadow-md hover:shadow-lg transition-all mb-6" data-id="${ticket.id}">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h2 class="text-lg font-semibold text-blue-800 flex items-center gap-2">
              <span class="text-xl">📬</span> ${escapeHTML(ticket.subject)}
            </h2>
            <p class="text-xs text-gray-500 mt-1">${new Date(ticket.created_at).toLocaleString()}</p>
          </div>
          <span class="inline-block bg-blue-100 text-blue-700 text-xs font-medium px-3 py-1 rounded-full border border-blue-200">
            ${escapeHTML(ticket.status || 'Open')}
          </span>
        </div>

        <p class="text-sm text-gray-800 mb-4 editable leading-relaxed bg-gray-50 p-3 rounded-lg hover:bg-gray-100 cursor-pointer" 
           data-id="${ticket.id}" data-field="message">
          ${escapeHTML(ticket.message)}
        </p>

        <div class="text-xs text-gray-600 mb-4">
          <strong>👤 User:</strong> ${escapeHTML(ticket.user_name || 'Unknown')} &lt;${escapeHTML(ticket.user_email || 'N/A')}&gt;
        </div>

        <div class="flex items-center justify-end flex-wrap gap-3 text-sm">
          <button class="replyBtn px-4 py-1.5 rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200 shadow-sm transition"
                  data-id="${ticket.id}" 
                  data-subject="${encodeURIComponent(ticket.subject)}"
                  data-email="${encodeURIComponent(ticket.user_email)}">
            ✉️ Reply
          </button>
          <button class="resolveBtn px-4 py-1.5 rounded-full bg-green-100 text-green-800 hover:bg-green-200 shadow-sm transition"
                  data-id="${ticket.id}">
            ✅ Mark Resolved
          </button>
          <button class="deleteBtn px-4 py-1.5 rounded-full bg-red-100 text-red-700 hover:bg-red-200 shadow-sm transition"
                  data-id="${ticket.id}">
            🗑 Delete
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
      btn.addEventListener('click', () => handleAction(`/api/support/${btn.dataset.id}/resolve`, '✅ Ticket marked as resolved'))
    );

    document.querySelectorAll('.deleteBtn').forEach(btn =>
      btn.addEventListener('click', () => {
        if (confirm('Delete this ticket permanently?')) {
          handleAction(`/api/support/${btn.dataset.id}`, '🗑 Ticket deleted', 'DELETE');
        }
      })
    );
  }

  function bindInPlaceEditing() {
    document.querySelectorAll('.editable').forEach(el => {
      el.addEventListener('click', () => {
        const { field, id } = el.dataset;
        const oldText = el.textContent;
        const textarea = document.createElement('textarea');

        textarea.value = oldText;
        textarea.className = 'w-full text-sm text-gray-800 p-3 rounded border mt-2';
        el.replaceWith(textarea);
        textarea.focus();

        textarea.addEventListener('blur', async () => {
          const newText = textarea.value;
          const updatedEl = document.createElement('p');
          updatedEl.className = el.className;
          updatedEl.dataset.id = id;
          updatedEl.dataset.field = field;
          updatedEl.textContent = escapeHTML(newText);

          textarea.replaceWith(updatedEl);
          bindInPlaceEditing();

          if (newText !== oldText) {
            try {
              const res = await fetch(`/api/support/${id}/edit`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ field, value: newText })
              });
              if (!res.ok) throw new Error();
              showToast('✏️ Message updated');
            } catch {
              showToast('❌ Failed to update');
            }
          }
        });
      });
    });
  }

  function openReplyModal(id, subject, email) {
    currentReplyTicketId = id;
    replyModalSubject.textContent = `Subject: ${subject} | To: ${email}`;
    replyMessage.value = '';
    replyModal.classList.remove('hidden');
    replyError.classList.add('hidden');
    replyMessage.classList.remove('border-red-500', 'ring-1', 'ring-red-300');
  }

  function closeReplyModal() {
    replyModal.classList.add('hidden');
  }

  async function submitReply() {
    const message = replyMessage.value.trim();
    if (!message) {
      replyError.textContent = 'Reply message cannot be empty.';
      replyError.classList.remove('hidden');
      replyMessage.classList.add('border-red-500', 'ring-1', 'ring-red-300');
      return;
    }

    replyError.classList.add('hidden');
    replyMessage.classList.remove('border-red-500', 'ring-1', 'ring-red-300');

    try {
      const res = await fetch(`/api/support/${currentReplyTicketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message })
      });

      if (!res.ok) throw new Error();
      showToast('✅ Reply sent');
      closeReplyModal();
      await refreshTickets();
    } catch {
      showToast('❌ Failed to send reply');
    }
  }

  async function handleAction(url, successMessage, method = 'PATCH') {
    try {
      const res = await fetch(url, { method, credentials: 'include' });
      if (!res.ok) throw new Error();
      showToast(successMessage);
      await refreshTickets();
    } catch {
      showToast('❌ Action failed');
    }
  }

  async function refreshTickets() {
    try {
      const res = await fetch('/api/support', { credentials: 'include' });
      if (!res.ok) throw new Error();
      const tickets = await res.json();
      allTickets = tickets;
      renderTickets(tickets);
    } catch {
      showToast('❌ Could not refresh tickets');
    }
  }

  function showToast(message = 'Done') {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('opacity-0');
    toast.classList.add('opacity-100');

    setTimeout(() => {
      toast.classList.remove('opacity-100');
      toast.classList.add('opacity-0');
    }, 3000);
  }

  // ESC key to close modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeReplyModal();
  });

  closeReplyBtn?.addEventListener('click', closeReplyModal);
  submitReplyBtn?.addEventListener('click', submitReply);
});
