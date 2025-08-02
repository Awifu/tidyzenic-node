// public/admin/js/tickets.js

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

  let allTickets = [];
  let currentTicketId = null;
  let businessId = null; // This should be dynamically set

  const TICKETS_PER_PAGE = 4;
  let currentPage = 1;

  // Get business_id (ideally from backend or auth info)
  async function fetchBusinessId() {
    try {
      const res = await fetch('/api/business/public');
      const data = await res.json();
      businessId = data.id;
    } catch (err) {
      console.error('Failed to fetch business info:', err);
    }
  }

  const createCard = (ticket) => {
    const card = document.createElement('div');
    card.className = 'bg-white border rounded-xl shadow-md p-5 space-y-2';

    card.innerHTML = `
      <h3 class="text-lg font-bold text-blue-700">${ticket.subject}</h3>
      <p class="text-gray-600">${ticket.message}</p>
      <p class="text-sm text-gray-400">From: <strong>${ticket.business_name}</strong></p>
      <p class="text-xs text-gray-500">Status: <span class="font-semibold">${ticket.status}</span></p>
      <div class="flex gap-2 mt-3">
        <button class="reply-btn bg-blue-600 text-white px-4 py-1 rounded" data-id="${ticket.id}">💬 Reply</button>
        <button class="thread-btn border border-indigo-600 text-indigo-600 px-4 py-1 rounded" data-id="${ticket.id}">📄 Show Thread</button>
        <button class="resolve-btn border border-green-600 text-green-600 px-4 py-1 rounded" data-id="${ticket.id}">✔ Mark Resolved</button>
        <button class="delete-btn border border-red-600 text-red-600 px-4 py-1 rounded" data-id="${ticket.id}">🗑 Delete</button>
      </div>
    `;

    return card;
  };

  const renderTickets = () => {
    const start = (currentPage - 1) * TICKETS_PER_PAGE;
    const end = start + TICKETS_PER_PAGE;
    const pageTickets = allTickets.slice(start, end);

    ticketList.innerHTML = '';

    if (pageTickets.length === 0) {
      emptyState.classList.remove('hidden');
    } else {
      emptyState.classList.add('hidden');
      pageTickets.forEach(ticket => {
        const card = createCard(ticket);
        ticketList.appendChild(card);
      });
    }

    renderPagination();
  };

  const renderPagination = () => {
    let totalPages = Math.ceil(allTickets.length / TICKETS_PER_PAGE);
    const wrapper = document.createElement('div');
    wrapper.className = 'flex justify-center gap-2 mt-6';

    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      btn.className = `px-3 py-1 rounded ${i === currentPage ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`;
      btn.addEventListener('click', () => {
        currentPage = i;
        renderTickets();
      });
      wrapper.appendChild(btn);
    }

    ticketList.appendChild(wrapper);
  };

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/tickets');
      const data = await res.json();
      allTickets = data.tickets || [];
      renderTickets();
    } catch (err) {
      console.error('Error loading tickets:', err);
    }
  };

  // Event delegation
  ticketList.addEventListener('click', async (e) => {
    const target = e.target;
    const ticketId = target.dataset.id;

    if (target.classList.contains('reply-btn')) {
      currentTicketId = ticketId;
      modalTextarea.value = '';
      modalTitle.textContent = 'Reply to Ticket';
      modalThread.innerHTML = '';
      modal.classList.remove('hidden');
    }

    if (target.classList.contains('thread-btn')) {
      await openThread(ticketId);
    }

    if (target.classList.contains('resolve-btn')) {
      await fetch(`/api/tickets/${ticketId}/resolve`, { method: 'POST' });
      fetchTickets();
    }

    if (target.classList.contains('delete-btn')) {
      if (confirm('Delete this ticket?')) {
        await fetch(`/api/tickets/${ticketId}`, { method: 'DELETE' });
        fetchTickets();
      }
    }
  });

  const openThread = async (ticketId) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/replies`);
      const data = await res.json();
      const replies = data.replies || [];

      const threadCard = allTickets.find(t => t.id == ticketId);
      if (!threadCard) return;

      currentTicketId = ticketId;
      modalTitle.textContent = `Thread: ${threadCard.subject}`;
      modalTextarea.value = '';
      modalThread.innerHTML = `
        <div class="mb-3 bg-gray-50 p-3 rounded border">
          <strong>${threadCard.business_name}</strong><br/>
          ${threadCard.message}
        </div>
      `;

      replies.forEach(reply => {
        const div = document.createElement('div');
        div.className = 'bg-gray-100 p-2 mb-2 rounded';
        div.innerHTML = `<strong>${reply.business_name}</strong>: ${reply.message}`;
        modalThread.appendChild(div);
      });

      modal.classList.remove('hidden');
    } catch (err) {
      console.error('Failed to fetch replies:', err);
    }
  };

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
      console.error('Failed to submit reply:', err);
    }
  });

  searchInput.addEventListener('input', () => {
    const term = searchInput.value.toLowerCase();
    const filtered = allTickets.filter(t =>
      t.subject.toLowerCase().includes(term) ||
      t.message.toLowerCase().includes(term)
    );
    currentPage = 1;
    allTickets = filtered;
    renderTickets();
  });

  // Startup
  fetchBusinessId().then(fetchTickets);
});
