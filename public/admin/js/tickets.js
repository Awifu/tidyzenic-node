// public/admin/js/tickets.js

document.addEventListener('DOMContentLoaded', () => {
  const ticketList = document.getElementById('ticketList');
  const emptyState = document.getElementById('emptyState');
  const searchInput = document.getElementById('ticketSearch');
  const modal = document.getElementById('ticketModal');
  const modalClose = document.getElementById('modalClose');
  const modalSubmit = document.getElementById('modalSubmit');
  const modalTextarea = document.getElementById('modalTextarea');
  let currentTicketId = null;
  let allTickets = [];

  const createCard = (ticket) => {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl shadow-md border p-6 space-y-3';

    const subject = `<h3 class="text-lg font-bold text-blue-700">${ticket.subject}</h3>`;
    const message = `<p class="text-sm text-gray-700">${ticket.message}</p>`;
    const status = `<p class="text-xs text-gray-500">Status: <span class="font-medium">${ticket.status}</span></p>`;
    const business = `<p class="text-xs text-gray-400">From: <span class="font-medium">${ticket.business_name}</span></p>`;

    const replyButton = `<button class="px-3 py-1 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded" data-action="reply">💬 Reply</button>`;
    const resolveButton = `<button class="px-3 py-1 text-sm text-green-600 border border-green-600 hover:bg-green-50 rounded" data-action="resolve">✔ Mark Resolved</button>`;
    const deleteButton = `<button class="px-3 py-1 text-sm text-red-600 border border-red-600 hover:bg-red-50 rounded" data-action="delete">🗑 Delete</button>`;
    const toggleThreadButton = `<button class="px-3 py-1 text-sm text-gray-600 border border-gray-300 hover:bg-gray-100 rounded" data-action="toggle-thread">📂 Show Thread</button>`;

    const actionBar = `<div class="flex flex-wrap gap-2 mt-4">${replyButton}${resolveButton}${deleteButton}${toggleThreadButton}</div>`;
    const repliesContainer = `<div class="mt-3 hidden space-y-2 text-sm text-gray-600" id="replies-${ticket.id}"></div>`;

    card.innerHTML = `${subject}${business}${message}${status}${actionBar}${repliesContainer}`;

    card.querySelector('[data-action="reply"]').addEventListener('click', () => openReplyModal(ticket.id));
    card.querySelector('[data-action="resolve"]').addEventListener('click', () => markResolved(ticket.id));
    card.querySelector('[data-action="delete"]').addEventListener('click', () => deleteTicket(ticket.id));
    card.querySelector('[data-action="toggle-thread"]').addEventListener('click', () => toggleThread(ticket.id));

    return card;
  };

  const openReplyModal = (ticketId) => {
    currentTicketId = ticketId;
    modalTextarea.value = '';
    modal.classList.remove('hidden');
  };

  const closeModal = () => {
    modal.classList.add('hidden');
    currentTicketId = null;
  };

  const renderTickets = (tickets) => {
    ticketList.innerHTML = '';
    if (!tickets.length) {
      emptyState.classList.remove('hidden');
      return;
    }
    emptyState.classList.add('hidden');
    tickets.forEach(ticket => ticketList.appendChild(createCard(ticket)));
  };

  const filterTickets = (term) => {
    const filtered = allTickets.filter(ticket =>
      ticket.subject.toLowerCase().includes(term) ||
      ticket.message.toLowerCase().includes(term)
    );
    renderTickets(filtered);
  };

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/tickets');
      const data = await res.json();
      allTickets = Array.isArray(data.tickets) ? data.tickets : [];
      renderTickets(allTickets);
    } catch (err) {
      console.error('Error loading tickets:', err);
    }
  };

  const fetchReplies = async (ticketId) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/replies`);
      const data = await res.json();
      const container = document.getElementById(`replies-${ticketId}`);
      container.innerHTML = '';
      (data.replies || []).forEach(reply => {
        const div = document.createElement('div');
        div.className = 'bg-gray-100 px-3 py-2 rounded';
        div.innerHTML = `<span class='font-semibold text-sm text-blue-600'>${reply.admin_name || 'Admin'}:</span> ${reply.message}`;
        container.appendChild(div);
      });
    } catch (err) {
      console.error('Error loading replies:', err);
    }
  };

  const toggleThread = (ticketId) => {
    const repliesEl = document.getElementById(`replies-${ticketId}`);
    if (repliesEl.classList.contains('hidden')) {
      repliesEl.classList.remove('hidden');
      fetchReplies(ticketId);
    } else {
      repliesEl.classList.add('hidden');
    }
  };

  const markResolved = async (ticketId) => {
    try {
      await fetch(`/api/tickets/${ticketId}/resolve`, { method: 'POST' });
      fetchTickets();
    } catch (err) {
      console.error('Failed to mark ticket resolved:', err);
    }
  };

  const deleteTicket = async (ticketId) => {
    if (!confirm('Are you sure you want to delete this ticket?')) return;
    try {
      await fetch(`/api/tickets/${ticketId}`, { method: 'DELETE' });
      fetchTickets();
    } catch (err) {
      console.error('Failed to delete ticket:', err);
    }
  };

  modalSubmit.addEventListener('click', async () => {
    const message = modalTextarea.value.trim();
    if (!message || !currentTicketId) return;
    try {
      await fetch(`/api/tickets/${currentTicketId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: 1, message })
      });
      closeModal();
      fetchReplies(currentTicketId);
    } catch (err) {
      console.error('Failed to send reply:', err);
    }
  });

  modalClose.addEventListener('click', closeModal);
  searchInput.addEventListener('input', (e) => filterTickets(e.target.value.toLowerCase()));

  const socket = io();
  socket.on('new_ticket', (ticket) => {
    allTickets.unshift(ticket);
    renderTickets(allTickets);
  });

  fetchTickets();
});
