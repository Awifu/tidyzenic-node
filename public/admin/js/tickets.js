document.addEventListener('DOMContentLoaded', () => {
  const ticketList = document.getElementById('ticketList');
  const emptyState = document.getElementById('emptyState');
  const searchInput = document.getElementById('ticketSearch');
  const modal = document.getElementById('ticketModal');
  const modalClose = document.getElementById('modalClose');
  const modalSubmit = document.getElementById('modalSubmit');
  const modalTextarea = document.getElementById('modalTextarea');
  const modalThread = document.getElementById('modalThread');
  const modalTitle = document.getElementById('modalTitle');
  const pagination = document.getElementById('pagination');
  const pageIndicator = document.getElementById('pageIndicator');
  const prevPageBtn = document.getElementById('prevPage');
  const nextPageBtn = document.getElementById('nextPage');

  let allTickets = [];
  let filteredTickets = [];
  let currentTicketId = null;
  let businessId = null;

  const TICKETS_PER_PAGE = 4;
  let currentPage = 1;

  // Fetch business ID
  async function fetchBusinessId() {
    try {
      const res = await fetch('/api/business/public');
      const data = await res.json();
      businessId = data.id;
    } catch (err) {
      console.error('❌ Failed to fetch business info:', err);
    }
  }

  // Card creator
  const createCard = (ticket) => {
    const card = document.createElement('div');
    card.className = 'bg-white border border-gray-200 rounded-2xl shadow-md p-5 transition hover:shadow-lg';

    card.innerHTML = `
      <h3 class="text-lg font-semibold text-blue-700">${ticket.subject}</h3>
      <p class="text-gray-700 mt-1">${ticket.message}</p>
      <p class="text-sm text-gray-500 mt-2">From: <strong>${ticket.business_name}</strong></p>
      <p class="text-xs text-gray-400">Status: <span class="font-medium">${ticket.status}</span></p>
      <div class="flex flex-wrap gap-2 mt-4">
        <button class="reply-btn bg-blue-600 text-white px-4 py-1 rounded shadow hover:bg-blue-700" data-id="${ticket.id}">💬 Reply</button>
        <button class="thread-btn border border-indigo-500 text-indigo-600 px-4 py-1 rounded hover:bg-indigo-50" data-id="${ticket.id}">📄 Show Thread</button>
        <button class="resolve-btn border border-green-500 text-green-600 px-4 py-1 rounded hover:bg-green-50" data-id="${ticket.id}">✔ Mark Resolved</button>
        <button class="delete-btn border border-red-500 text-red-600 px-4 py-1 rounded hover:bg-red-50" data-id="${ticket.id}">🗑 Delete</button>
      </div>
    `;
    return card;
  };

  const renderPagination = () => {
    const totalPages = Math.ceil(filteredTickets.length / TICKETS_PER_PAGE);

    pageIndicator.textContent = `Page ${currentPage}`;
    pagination.classList.toggle('hidden', totalPages <= 1);

    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
  };

  const renderTickets = () => {
    const start = (currentPage - 1) * TICKETS_PER_PAGE;
    const end = start + TICKETS_PER_PAGE;
    const visibleTickets = filteredTickets.slice(start, end);

    ticketList.innerHTML = '';
    emptyState.classList.toggle('hidden', visibleTickets.length > 0);

    visibleTickets.forEach(ticket => {
      const card = createCard(ticket);
      ticketList.appendChild(card);
    });

    renderPagination();
  };

const fetchTickets = async () => {
  try {
    const res = await fetch('/api/tickets');
    const data = await res.json();
    allTickets = data.tickets || [];
    filteredTickets = [...allTickets]; // <-- keep a filtered copy
    currentPage = 1;
    renderTickets();
  } catch (err) {
    console.error('❌ Error loading tickets:', err);
  }
};


  // Thread Modal
  const openThread = async (ticketId) => {
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
        <div class="mb-3 bg-gray-100 p-3 rounded border">
          <strong>${ticket.business_name}</strong><br/>
          ${ticket.message}
        </div>
      `;

      replies.forEach(reply => {
        const div = document.createElement('div');
        div.className = 'bg-blue-50 p-2 mb-2 rounded';
        div.innerHTML = `<strong>${reply.business_name}</strong>: ${reply.message}`;
        modalThread.appendChild(div);
      });

      modal.classList.remove('hidden');
    } catch (err) {
      console.error('❌ Failed to fetch replies:', err);
    }
  };

  // Event: actions inside ticket list
  ticketList.addEventListener('click', async (e) => {
    const btn = e.target;
    const id = btn.dataset.id;

    if (btn.classList.contains('reply-btn')) {
      const ticket = allTickets.find(t => t.id == id);
      modalTitle.textContent = `Reply to: ${ticket.subject}`;
      modalTextarea.value = '';
      modalThread.innerHTML = '';
      currentTicketId = id;
      modal.classList.remove('hidden');
    }

    if (btn.classList.contains('thread-btn')) await openThread(id);

    if (btn.classList.contains('resolve-btn')) {
      await fetch(`/api/tickets/${id}/resolve`, { method: 'POST' });
      fetchTickets();
    }

    if (btn.classList.contains('delete-btn')) {
      if (confirm('Delete this ticket?')) {
        await fetch(`/api/tickets/${id}`, { method: 'DELETE' });
        fetchTickets();
      }
    }
  });

  // Modal actions
  modalClose.addEventListener('click', () => {
    modal.classList.add('hidden');
    currentTicketId = null;
  });

  modalSubmit.addEventListener('click', async () => {
    const message = modalTextarea.value.trim();
    if (!message || !currentTicketId || !businessId) return;

    try {
      await fetch(`/api/tickets/${currentTicketId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: businessId, message })
      });
      modal.classList.add('hidden');
      fetchTickets();
    } catch (err) {
      console.error('❌ Failed to submit reply:', err);
    }
  });

  // Pagination
  prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderTickets();
    }
  });

  nextPageBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredTickets.length / TICKETS_PER_PAGE);
    if (currentPage < totalPages) {
      currentPage++;
      renderTickets();
    }
  });

searchInput.addEventListener('input', () => {
  const term = searchInput.value.toLowerCase().trim();

  filteredTickets = term
    ? allTickets.filter(t =>
        t.subject.toLowerCase().includes(term) ||
        t.message.toLowerCase().includes(term)
      )
    : [...allTickets]; // <-- restore full list when empty

  currentPage = 1;
  renderTickets();
});

  // Init
  fetchBusinessId().then(fetchTickets);
});
