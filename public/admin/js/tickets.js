document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const ticketList = $('ticketList');
  const emptyState = $('emptyState');
  const searchInput = $('ticketSearch');
  const modal = $('ticketModal');
  const modalClose = $('modalClose');
  const modalSubmit = $('modalSubmit');
  const modalTextarea = $('modalTextarea');
  const modalThread = $('modalThread');
  const modalTitle = $('modalTitle');
  const pagination = $('pagination');
  const pageIndicator = $('pageIndicator');
  const prevPageBtn = $('prevPage');
  const nextPageBtn = $('nextPage');
  const filterDate = $('filterDate');
  const filterStatus = $('filterStatus');

  const TICKETS_PER_PAGE = 2;
  let allTickets = [];
  let filteredTickets = [];
  let currentPage = 1;
  let currentTicketId = null;
  let businessId = null;

  const formatRelativeTime = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    const times = [
      { limit: 60, value: 1, unit: 'second' },
      { limit: 3600, value: 60, unit: 'minute' },
      { limit: 86400, value: 3600, unit: 'hour' },
      { limit: 604800, value: 86400, unit: 'day' },
      { limit: 2592000, value: 604800, unit: 'week' },
      { limit: 31536000, value: 2592000, unit: 'month' },
      { limit: Infinity, value: 31536000, unit: 'year' },
    ];
    for (let { limit, value, unit } of times) {
      if (diff < limit) {
        const relative = Math.floor(diff / value);
        return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-relative, unit);
      }
    }
    return 'some time ago';
  };

  const createCard = (ticket) => {
    const card = document.createElement('div');
    card.className = 'bg-white border border-gray-200 rounded-2xl shadow-md p-6 sm:p-8 transition hover:shadow-lg space-y-6';

    card.innerHTML = `
      <div class="space-y-4">
        <h3 class="text-xl font-bold text-indigo-700">${ticket.subject}</h3>
        <p class="text-base text-gray-800 leading-relaxed">${ticket.message}</p>
        <div class="text-sm text-gray-600 space-y-1 pt-2">
          <p><span class="font-medium text-gray-800">From:</span> ${ticket.business_name}</p>
          <p>
            <span class="font-medium text-gray-800">Status:</span> 
            <button class="status-toggle-btn font-medium focus:outline-none" data-id="${ticket.id}" data-status="${ticket.status}">
              <span class="${ticket.status === 'Resolved' ? 'text-green-600' : 'text-gray-500'}">${ticket.status}</span>
            </button>
          </p>
          <p><span class="font-medium text-gray-800">Created:</span> ${formatRelativeTime(ticket.created_at)}</p>
        </div>
      </div>
      <div class="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 pt-6 mt-4 border-t border-gray-100">
        <button class="reply-btn bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-6 py-2.5 rounded-full shadow-sm transition w-full sm:w-auto" data-id="${ticket.id}">💬 Reply</button>
        <button class="thread-btn border border-indigo-300 text-indigo-600 hover:bg-indigo-50 text-sm px-6 py-2.5 rounded-full transition w-full sm:w-auto" data-id="${ticket.id}">📄 Show Thread</button>
        <button class="resolve-btn border border-green-300 text-green-600 hover:bg-green-50 text-sm px-6 py-2.5 rounded-full transition w-full sm:w-auto" data-id="${ticket.id}">✔ Mark Resolved</button>
        <button class="delete-btn border border-red-300 text-red-600 hover:bg-red-50 text-sm px-6 py-2.5 rounded-full transition w-full sm:w-auto" data-id="${ticket.id}">🗑 Delete</button>
      </div>
    `;

    card.querySelector('.status-toggle-btn')?.addEventListener('click', async () => {
      const id = ticket.id;
      const currentStatus = ticket.status;
      const newStatus = currentStatus === 'Resolved' ? 'Open' : 'Resolved';

      try {
        const res = await fetch(`/api/tickets/${id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        if (res.ok) fetchTickets();
      } catch (err) {
        console.error('❌ Status update failed:', err);
      }
    });

    return card;
  };

  const renderPagination = () => {
    const totalPages = Math.ceil(filteredTickets.length / TICKETS_PER_PAGE);
    if (pageIndicator) pageIndicator.textContent = `Page ${currentPage}`;
    pagination?.classList.toggle('hidden', totalPages <= 1);
    if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
  };

  const renderTickets = () => {
    if (!ticketList || !emptyState) return;

    const start = (currentPage - 1) * TICKETS_PER_PAGE;
    const end = start + TICKETS_PER_PAGE;
    const visibleTickets = filteredTickets.slice(start, end);

    ticketList.innerHTML = '';
    emptyState.classList.toggle('hidden', visibleTickets.length > 0);
    visibleTickets.forEach(ticket => ticketList.appendChild(createCard(ticket)));

    renderPagination();
  };

  const applyFilters = () => {
    if (!searchInput) return;
    const term = searchInput.value.toLowerCase().trim();
    const dateOrder = filterDate?.value;
    const status = filterStatus?.value.toLowerCase();

    filteredTickets = [...allTickets];

    if (term) {
      filteredTickets = filteredTickets.filter(t =>
        t.subject.toLowerCase().includes(term) || t.message.toLowerCase().includes(term)
      );
    }

    if (status) {
      filteredTickets = filteredTickets.filter(t => t.status.toLowerCase() === status);
    }

    if (dateOrder === 'newest') {
      filteredTickets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (dateOrder === 'oldest') {
      filteredTickets.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    currentPage = 1;
    renderTickets();
  };

  const fetchBusinessId = async () => {
    try {
      const res = await fetch('/api/business/public');
      const data = await res.json();
      businessId = data.id;
    } catch (err) {
      console.error('❌ Failed to fetch business ID:', err);
    }
  };

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/tickets');
      const data = await res.json();
      allTickets = data.tickets || [];
      filteredTickets = [...allTickets];
      applyFilters();
    } catch (err) {
      console.error('❌ Failed to fetch tickets:', err);
    }
  };

  const openThread = async (ticketId) => {
    if (!modal || !modalThread || !modalTitle || !modalTextarea) return;

    try {
      const res = await fetch(`/api/tickets/${ticketId}/replies`);
      const data = await res.json();
      const replies = data.replies || [];
      const ticket = allTickets.find(t => t.id == ticketId);
      if (!ticket) return;

      currentTicketId = ticketId;
      modalTitle.textContent = `Thread: ${ticket.subject}`;
      modalTextarea.value = '';
      modalThread.innerHTML = `
        <div class="mb-3 bg-gray-100 p-3 rounded border text-sm">
          <strong>${ticket.business_name}</strong> <span class="text-xs text-gray-500">(${formatRelativeTime(ticket.created_at)})</span><br/>
          ${ticket.message}
        </div>
      `;

      replies.forEach(reply => {
        const div = document.createElement('div');
        div.className = 'bg-blue-50 p-2 mb-2 rounded text-sm';
        div.innerHTML = `
          <div class="flex justify-between">
            <strong>${reply.business_name}</strong>
            <span class="text-xs text-gray-500">${formatRelativeTime(reply.created_at)}</span>
          </div>
          <div>${reply.message}</div>
        `;
        modalThread.appendChild(div);
      });

      modal.classList.remove('hidden');
    } catch (err) {
      console.error('❌ Failed to open thread:', err);
    }
  };

  // Safely bind all listeners
  if (ticketList) {
    ticketList.addEventListener('click', async (e) => {
      const btn = e.target;
      const id = btn.dataset?.id;
      const ticket = allTickets.find(t => t.id == id);
      if (!id || !ticket) return;

      if (btn.classList.contains('reply-btn')) {
        if (!modal || !modalTextarea || !modalTitle) return;
        modalTitle.textContent = `Reply to: ${ticket.subject}`;
        modalTextarea.value = '';
        modalThread.innerHTML = '';
        currentTicketId = id;
        modal.classList.remove('hidden');
      }

      if (btn.classList.contains('thread-btn')) await openThread(id);

      if (btn.classList.contains('resolve-btn')) {
        const newStatus = ticket.status === 'Resolved' ? 'Open' : 'Resolved';
        try {
          await fetch(`/api/tickets/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
          });
          fetchTickets();
        } catch (err) {
          console.error('❌ Failed to toggle status:', err);
        }
      }

      if (btn.classList.contains('delete-btn') && confirm('Delete this ticket?')) {
        await fetch(`/api/tickets/${id}`, { method: 'DELETE' });
        fetchTickets();
      }
    });
  }

  modalClose?.addEventListener('click', () => {
    modal?.classList.add('hidden');
    currentTicketId = null;
  });

  modalSubmit?.addEventListener('click', async () => {
    const message = modalTextarea?.value.trim();
    if (!message || !currentTicketId || !businessId) return;

    try {
      await fetch(`/api/tickets/${currentTicketId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: businessId, message }),
      });
      modal?.classList.add('hidden');
      fetchTickets();
    } catch (err) {
      console.error('❌ Failed to post reply:', err);
    }
  });

  prevPageBtn?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderTickets();
    }
  });

  nextPageBtn?.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredTickets.length / TICKETS_PER_PAGE);
    if (currentPage < totalPages) {
      currentPage++;
      renderTickets();
    }
  });

  filterDate?.addEventListener('change', applyFilters);
  filterStatus?.addEventListener('change', applyFilters);
  searchInput?.addEventListener('input', applyFilters);

  fetchBusinessId().then(fetchTickets);
});
