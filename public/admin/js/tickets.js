// File path: public/admin/js/tickets.js

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

  const renderTickets = (tickets) => {
    ticketList.innerHTML = '';

    if (!tickets.length) {
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    tickets.forEach(ticket => {
      const card = document.createElement('div');
      card.className = 'bg-white p-5 rounded-2xl shadow flex flex-col gap-2 animate-fade-in';

      card.innerHTML = `
        <div class="flex justify-between items-start">
          <div>
            <h3 class="text-lg font-semibold text-blue-700">${ticket.subject}</h3>
            <p class="text-gray-700 mt-1">${ticket.message}</p>
            <p class="text-sm text-gray-400 mt-2">Status: <span class="font-semibold">${ticket.status}</span></p>
            <p class="text-sm text-gray-400">Business: <span class="font-medium">${ticket.business_name || 'N/A'}</span></p>
          </div>
          <div class="flex flex-col items-end gap-2">
            <button class="reply-btn px-4 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center gap-1" data-id="${ticket.id}">
              💬 <span>Reply</span>
            </button>
            <button class="resolve-btn px-4 py-1 rounded-lg bg-green-100 hover:bg-green-200 text-green-700" data-id="${ticket.id}">✅ Resolved</button>
            <button class="delete-btn px-4 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-700" data-id="${ticket.id}">🗑️ Delete</button>
          </div>
        </div>
        <div id="replies-${ticket.id}" class="mt-3 space-y-2"></div>
      `;

      ticketList.appendChild(card);
      loadReplies(ticket.id);
    });

    document.querySelectorAll('.reply-btn').forEach(btn => btn.addEventListener('click', openReplyModal));
    document.querySelectorAll('.resolve-btn').forEach(btn => btn.addEventListener('click', markAsResolved));
    document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', deleteTicket));
  };

  const loadReplies = async (ticketId) => {
    const replyContainer = document.getElementById(`replies-${ticketId}`);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/replies`);
      const data = await res.json();
      replyContainer.innerHTML = data.replies.map(reply => `
        <div class="bg-gray-100 rounded-lg p-3 text-sm">
          <p class="text-gray-800">${reply.message}</p>
          <p class="text-xs text-gray-400 mt-1">— ${reply.admin_name || 'Admin'}</p>
        </div>`
      ).join('');
    } catch (err) {
      console.error('Error loading replies:', err);
    }
  };

  const openReplyModal = (e) => {
    currentTicketId = e.currentTarget.dataset.id;
    modalTextarea.value = '';
    modal.classList.remove('hidden');
  };

  const closeModal = () => {
    modal.classList.add('hidden');
    currentTicketId = null;
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
      fetchTickets();
    } catch (err) {
      console.error('Failed to send reply:', err);
    }
  });

  const markAsResolved = async (e) => {
    const ticketId = e.currentTarget.dataset.id;
    try {
      await fetch(`/api/tickets/${ticketId}/resolve`, { method: 'POST' });
      fetchTickets();
    } catch (err) {
      console.error('Failed to resolve ticket:', err);
    }
  };

  const deleteTicket = async (e) => {
    const ticketId = e.currentTarget.dataset.id;
    try {
      await fetch(`/api/tickets/${ticketId}`, { method: 'DELETE' });
      fetchTickets();
    } catch (err) {
      console.error('Failed to delete ticket:', err);
    }
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

  modalClose.addEventListener('click', closeModal);
  searchInput.addEventListener('input', e => filterTickets(e.target.value.toLowerCase()));

  const socket = io();
  socket.on('new_ticket', ticket => {
    allTickets.unshift(ticket);
    renderTickets(allTickets);
  });

  fetchTickets();
});
