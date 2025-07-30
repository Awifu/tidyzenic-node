document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('supportTickets');
  const adminEmailEl = document.getElementById('adminBadgeEmail');
  const searchInput = document.getElementById('ticketSearch');
  const closeReplyBtn = document.getElementById('closeReplyBtn');
  const submitReplyBtn = document.getElementById('submitReplyBtn');
  const replyModal = document.getElementById('replyModal');
  const replyModalSubject = document.getElementById('replyModalSubject');
  const replyMessage = document.getElementById('replyMessage');
  const toast = document.getElementById('toast');

  let tickets = [];
  let replyingTo = null;

  const STATUS_OPTIONS = ['Open', 'In Progress', 'Replied', 'Resolved'];

  const fetchTickets = async () => {
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
  };

  const renderTickets = (list) => {
    if (!list.length) {
      container.innerHTML = `<p class="text-center text-gray-400">No support tickets found.</p>`;
      return;
    }

    container.innerHTML = list.map(t => `
      <div class="ticket bg-white border p-6 rounded-xl shadow-sm mb-6" data-id="${t.id}">
        <div class="flex justify-between mb-2">
          <div>
            <h2 class="editable font-semibold text-blue-800 text-lg cursor-pointer" data-id="${t.id}" data-field="subject">${t.subject}</h2>
            <p class="text-xs text-gray-500">${new Date(t.created_at).toLocaleString()}</p>
          </div>
          <span class="editable text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-800 cursor-pointer" data-id="${t.id}" data-field="status">
            ${t.status || 'Open'}
          </span>
        </div>

        <p class="editable text-sm text-gray-800 p-3 bg-gray-50 rounded-md hover:bg-gray-100 cursor-pointer mt-2" data-id="${t.id}" data-field="message">
          ${t.message}
        </p>

        <p class="text-xs text-gray-600 mt-3">👤 ${t.user_name || 'Unknown'} &lt;${t.user_email}&gt;</p>

        <div class="flex gap-3 justify-end mt-4 text-sm">
          <button class="replyBtn bg-blue-100 text-blue-800 px-4 py-1.5 rounded-full" data-id="${t.id}" data-subject="${encodeURIComponent(t.subject)}" data-email="${encodeURIComponent(t.user_email)}">✉️ Reply</button>
          <button class="resolveBtn bg-green-100 text-green-800 px-4 py-1.5 rounded-full" data-id="${t.id}">✅ Resolve</button>
          <button class="deleteBtn bg-red-100 text-red-700 px-4 py-1.5 rounded-full" data-id="${t.id}">🗑 Delete</button>
        </div>
      </div>
    `).join('');

    bindEvents();
  };

  const bindEvents = () => {
    document.querySelectorAll('.replyBtn').forEach(btn =>
      btn.addEventListener('click', () =>
        openReplyModal(btn.dataset.id, decodeURIComponent(btn.dataset.subject), decodeURIComponent(btn.dataset.email)))
    );

    document.querySelectorAll('.resolveBtn').forEach(btn =>
      btn.addEventListener('click', () =>
        handleAction(`/api/support/${btn.dataset.id}/resolve`, 'PATCH', '✅ Ticket resolved'))
    );

    document.querySelectorAll('.deleteBtn').forEach(btn =>
      btn.addEventListener('click', () =>
        confirm('Delete this ticket?') && handleAction(`/api/support/${btn.dataset.id}`, 'DELETE', '🗑️ Ticket deleted'))
    );

    document.querySelectorAll('.editable').forEach(el => {
      el.addEventListener('click', () => {
        if (el.classList.contains('editing')) return;

        const { id, field } = el.dataset;
        const oldText = el.textContent.trim();

        el.classList.add('editing');
        const wrapper = document.createElement('div');
        wrapper.className = 'inline-edit-wrapper';

        let input;
        if (field === 'status') {
          input = document.createElement('select');
          STATUS_OPTIONS.forEach(opt => {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt;
            if (opt === oldText) o.selected = true;
            input.appendChild(o);
          });
        } else {
          input = document.createElement(field === 'message' ? 'textarea' : 'input');
          input.value = oldText;
        }

        input.className = 'w-full text-sm p-3 border rounded-md';

        const btn = document.createElement('button');
        btn.textContent = '💾 Save';
        btn.className = 'inline-edit-save';
        wrapper.append(input, btn);
        el.replaceWith(wrapper);
        input.focus();

        const revert = () => {
          wrapper.replaceWith(el);
          el.classList.remove('editing');
          bindEvents();
        };

        btn.addEventListener('click', async () => {
          const value = input.value.trim();
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

            const newEl = document.createElement(el.tagName.toLowerCase());
            newEl.className = el.className;
            newEl.dataset.id = id;
            newEl.dataset.field = field;
            newEl.textContent = value;
            newEl.classList.add('highlight-success');

            wrapper.replaceWith(newEl);
            setTimeout(() => newEl.classList.remove('highlight-success'), 1200);
            bindEvents();
            showToast('✅ Ticket updated');
          } catch {
            showToast('❌ Update failed');
            revert();
          }
        });

        input.addEventListener('keydown', e => {
          if (e.key === 'Escape') revert();
        });
      });
    });
  };

  const openReplyModal = (id, subject, email) => {
    replyingTo = id;
    replyMessage.value = '';
    replyModal.classList.remove('hidden');
    replyModalSubject.textContent = `Subject: ${subject} | To: ${email}`;
  };

  const closeReplyModal = () => {
    replyingTo = null;
    replyModal.classList.add('hidden');
  };

  const submitReply = async () => {
    const message = replyMessage.value.trim();
    if (!message) return showToast('❌ Message is required');

    try {
      const res = await fetch(`/api/support/${replyingTo}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message }),
      });

      if (!res.ok) throw new Error();
      showToast('✅ Reply sent');
      closeReplyModal();
      fetchTickets();
    } catch {
      showToast('❌ Failed to send reply');
    }
  };

  const handleAction = async (url, method, successMsg) => {
    try {
      const res = await fetch(url, { method, credentials: 'include' });
      if (!res.ok) throw new Error();
      showToast(successMsg);
      fetchTickets();
    } catch {
      showToast('❌ Action failed');
    }
  };

  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.remove('opacity-0');
    toast.classList.add('opacity-100');
    setTimeout(() => {
      toast.classList.remove('opacity-100');
      toast.classList.add('opacity-0');
    }, 3000);
  };

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
