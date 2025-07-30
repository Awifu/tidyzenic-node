document.addEventListener('DOMContentLoaded', async () => {
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
    <div class="ticket bg-white/80 border border-gray-200 p-6 rounded-2xl shadow-md hover:shadow-lg transition-all mb-6 backdrop-blur-sm" data-id="${ticket.id}">
      
      <div class="flex justify-between items-start mb-4">
        <div>
          <h2 class="text-lg font-semibold text-blue-800 flex items-center gap-2">
            <span class="text-xl">📬</span> ${ticket.subject}
          </h2>
          <p class="text-xs text-gray-500 mt-1">${new Date(ticket.created_at).toLocaleString()}</p>
        </div>
        <span class="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 border border-blue-200">
          ${ticket.status || 'Open'}
        </span>
      </div>

      <p class="text-sm text-gray-800 mb-4 editable leading-relaxed bg-gray-50 p-3 rounded-lg hover:bg-gray-100 cursor-pointer" 
         data-id="${ticket.id}" data-field="message">
        ${ticket.message}
      </p>

      <div class="text-xs text-gray-600 mb-4">
        <strong>👤 User:</strong> ${ticket.user_name || 'Unknown'} &lt;${ticket.user_email || 'N/A'}&gt;
      </div>

      <div class="flex items-center justify-end flex-wrap gap-3 text-sm">
        <button class="px-4 py-1.5 rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200 transition shadow-sm replyBtn"
                data-id="${ticket.id}" 
                data-subject='${encodeURIComponent(ticket.subject)}'
                data-email='${encodeURIComponent(ticket.user_email)}'>
          ✉️ Reply
        </button>

        <button class="px-4 py-1.5 rounded-full bg-green-100 text-green-800 hover:bg-green-200 transition shadow-sm resolveBtn"
                data-id="${ticket.id}">
          ✅ Mark Resolved
        </button>

        <button class="px-4 py-1.5 rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition shadow-sm deleteBtn"
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
      btn.addEventListener('click', () => handleMarkResolved(btn.dataset.id))
    );
    document.querySelectorAll('.deleteBtn').forEach(btn =>
      btn.addEventListener('click', () => handleDelete(btn.dataset.id))
    );
  }

  function bindInPlaceEditing() {
  document.querySelectorAll('.editable').forEach(el => {
    el.addEventListener('click', () => {
      if (el.classList.contains('editing')) return;
      el.classList.add('editing');

      const { field, id } = el.dataset;
      const oldText = el.textContent.trim();

      const wrapper = document.createElement('div');
      wrapper.className = 'space-y-2';

      const textarea = document.createElement('textarea');
      textarea.value = oldText;
      textarea.className = 'w-full text-sm text-gray-800 p-3 rounded-lg border focus:ring-2 focus:ring-blue-300';
      wrapper.appendChild(textarea);

      const saveBtn = document.createElement('button');
      saveBtn.textContent = '💾 Update';
      saveBtn.className = 'bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1 rounded-lg shadow transition';
      wrapper.appendChild(saveBtn);

      el.replaceWith(wrapper);
      textarea.focus();

      const revert = () => {
        const original = document.createElement('p');
        original.className = el.className;
        original.dataset.id = id;
        original.dataset.field = field;
        original.textContent = oldText;
        wrapper.replaceWith(original);
        bindInPlaceEditing();
      };

      saveBtn.addEventListener('click', async () => {
        const newText = textarea.value.trim();
        if (!newText || newText === oldText) return revert();

        try {
          const res = await fetch(`/api/support/${id}/edit`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ field, value: newText }),
          });

          if (!res.ok) throw new Error('Update failed');

          const updatedEl = document.createElement('p');
          updatedEl.className = el.className;
          updatedEl.dataset.id = id;
          updatedEl.dataset.field = field;
          updatedEl.textContent = newText;

          wrapper.replaceWith(updatedEl);
          bindInPlaceEditing();
          showToast('✅ Ticket updated successfully', 'success');
        } catch (err) {
          console.error(err);
          showToast('❌ Failed to update message', 'error');
          revert();
        }
      });

      // Optional: Save on blur
      textarea.addEventListener('blur', () => {
        setTimeout(() => {
          if (document.activeElement !== saveBtn) {
            saveBtn.click();
          }
        }, 100);
      });

      // ESC to cancel
      textarea.addEventListener('keydown', e => {
        if (e.key === 'Escape') revert();
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
      setTimeout(() => location.reload(), 1500);
    } catch {
      showToast('❌ Failed to send reply');
    }
  }

  async function handleMarkResolved(id) {
    if (!confirm('Mark this ticket as resolved?')) return;
    try {
      const res = await fetch(`/api/support/${id}/resolve`, {
        method: 'PATCH',
        credentials: 'include'
      });
      if (!res.ok) throw new Error();
      showToast('✅ Ticket marked as resolved');
      setTimeout(() => location.reload(), 1000);
    } catch {
      showToast('❌ Failed to mark as resolved');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this ticket permanently?')) return;
    try {
      const res = await fetch(`/api/support/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error();
      showToast('🗑️ Ticket deleted');
      setTimeout(() => location.reload(), 1000);
    } catch {
      showToast('❌ Failed to delete ticket');
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

  closeReplyBtn?.addEventListener('click', closeReplyModal);
  submitReplyBtn?.addEventListener('click', submitReply);
});
