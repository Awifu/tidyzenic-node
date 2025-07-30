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

  let tickets = [];
  let replyingTo = null;

  async function fetchTickets() {
    try {
      const res = await fetch('/api/support', { credentials: 'include' });
      if (!res.ok) throw new Error();
      tickets = await res.json();
      if (!Array.isArray(tickets)) throw new Error();
      if (tickets[0]?.business_email) adminEmailEl.textContent = tickets[0].business_email;
      renderTickets(tickets);
    } catch {
      container.innerHTML = `<p class="text-red-600 text-center">❌ Failed to load tickets</p>`;
    }
  }

  function renderTickets(list) {
    if (!list.length) {
      container.innerHTML = `<p class="text-center text-gray-400">No support tickets found.</p>`;
      return;
    }

    container.innerHTML = list.map(t => `
      <div class="ticket bg-white border p-6 rounded-xl shadow-md mb-6" data-id="${t.id}">
        <div class="flex justify-between mb-2">
          <div>
            <h2 class="font-semibold text-blue-800 text-lg flex items-center gap-1">
              📬 ${t.subject}
            </h2>
            <p class="text-xs text-gray-500">${new Date(t.created_at).toLocaleString()}</p>
          </div>
          <span class="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full">${t.status || 'Open'}</span>
        </div>

        <p class="editable text-sm text-gray-700 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer relative"
           data-id="${t.id}" data-field="message">
          ${t.message}
          <span class="edit-icon absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">✏️</span>
        </p>

        <p class="text-xs text-gray-500 mt-2">
          <strong>👤</strong> ${t.user_name || 'Unknown'} &lt;${t.user_email}&gt;
        </p>

        <div class="flex gap-3 justify-end mt-4 text-sm">
          <button class="replyBtn bg-blue-100 text-blue-800 px-4 py-1.5 rounded-full" data-id="${t.id}" data-subject="${encodeURIComponent(t.subject)}" data-email="${encodeURIComponent(t.user_email)}">✉️ Reply</button>
          <button class="resolveBtn bg-green-100 text-green-800 px-4 py-1.5 rounded-full" data-id="${t.id}">✅ Resolve</button>
          <button class="deleteBtn bg-red-100 text-red-700 px-4 py-1.5 rounded-full" data-id="${t.id}">🗑 Delete</button>
        </div>
      </div>
    `).join('');

    bindEvents();
  }

  function bindEvents() {
    document.querySelectorAll('.replyBtn').forEach(btn =>
      btn.addEventListener('click', () =>
        openReplyModal(btn.dataset.id, decodeURIComponent(btn.dataset.subject), decodeURIComponent(btn.dataset.email)))
    );

    document.querySelectorAll('.resolveBtn').forEach(btn =>
      btn.addEventListener('click', () => handleAction(`/api/support/${btn.dataset.id}/resolve`, 'PATCH', '✅ Ticket resolved')));

    document.querySelectorAll('.deleteBtn').forEach(btn =>
      btn.addEventListener('click', () =>
        confirm('Delete this ticket?') && handleAction(`/api/support/${btn.dataset.id}`, 'DELETE', '🗑️ Ticket deleted'))
    );

    document.querySelectorAll('.editable').forEach(p => {
      p.addEventListener('click', () => {
        if (p.classList.contains('editing')) return;

        const { id, field } = p.dataset;
        const oldText = p.textContent.trim();

        const wrapper = document.createElement('div');
        wrapper.className = 'space-y-2';

        const textarea = document.createElement('textarea');
        textarea.className = 'w-full p-3 border rounded-lg text-sm';
        textarea.value = oldText;

        const btn = document.createElement('button');
        btn.className = 'bg-blue-600 text-white px-4 py-1 text-sm rounded-lg';
        btn.textContent = '💾 Save';

        wrapper.append(textarea, btn);
        p.replaceWith(wrapper);
        textarea.focus();

        const revert = () => {
          wrapper.replaceWith(p);
          bindEvents();
        };

        btn.addEventListener('click', async () => {
          const value = textarea.value.trim();
          if (!value || value === oldText) return revert();

          btn.disabled = true;
          btn.textContent = 'Saving...';

          try {
            const res = await fetch(`/api/support/${id}/edit`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ field, value }),
            });
            if (!res.ok) throw new Error();

            const newEl = document.createElement('p');
            newEl.className = p.className;
            newEl.dataset.id = id;
            newEl.dataset.field = field;
            newEl.textContent = value;
            newEl.classList.add('highlight-success');

            wrapper.replaceWith(newEl);
            bindEvents();
            setTimeout(() => newEl.classList.remove('highlight-success'), 1200);
            showToast('✅ Ticket updated');
          } catch {
            showToast('❌ Failed to update');
            revert();
          }
        });

        textarea.addEventListener('keydown', e => {
          if (e.key === 'Escape') revert();
        });
      });
    });
  }

  function openReplyModal(id, subject, email) {
    replyingTo = id;
    replyModal.classList.remove('hidden');
    replyMessage.value = '';
    replyModalSubject.textContent = `Subject: ${subject} | To: ${email}`;
  }

  function closeReplyModal() {
    replyModal.classList.add('hidden');
    replyingTo = null;
  }

  async function submitReply() {
    const message = replyMessage.value.trim();
    if (!message) return showToast('❌ Message required');

    try {
      const res = await fetch(`/api/support/${replyingTo}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error();
      closeReplyModal();
      showToast('✅ Reply sent');
      await fetchTickets();
    } catch {
      showToast('❌ Failed to send reply');
    }
  }

  async function handleAction(url, method, successMsg) {
    try {
      const res = await fetch(url, { method, credentials: 'include' });
      if (!res.ok) throw new Error();
      showToast(successMsg);
      await fetchTickets();
    } catch {
      showToast('❌ Action failed');
    }
  }

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('opacity-0');
    toast.classList.add('opacity-100');
    setTimeout(() => {
      toast.classList.remove('opacity-100');
      toast.classList.add('opacity-0');
    }, 3000);
  }

  closeReplyBtn?.addEventListener('click', closeReplyModal);
  submitReplyBtn?.addEventListener('click', submitReply);

  searchInput?.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase();
    const filtered = tickets.filter(t =>
      t.subject.toLowerCase().includes(q) ||
      t.message.toLowerCase().includes(q) ||
      t.user_email.toLowerCase().includes(q)
    );
    renderTickets(filtered);
  });

  fetchTickets();
});
