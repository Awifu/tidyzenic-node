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

  const renderTickets = (tickets) => {
    ticketList.innerHTML = '';

    if (!tickets.length) {
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    tickets.forEach(ticket => {
      const card = document.createElement('div');
      card.className = 'bg-white rounded-xl p-4 shadow border flex justify-between items-start';

      const content = `
        <div>
          <h3 class="text-lg font-semibold text-blue-600">${ticket.subject}</h3>
          <p class="text-sm text-gray-700 mt-1">${ticket.message}</p>
          <p class="text-xs text-gray-500 mt-2">Status: <span class="font-medium">${ticket.status || 'Open'}</span></p>
        </div>
        <button 
          class="ml-4 px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200" 
          data-ticket-id="${ticket.id}">
          💬 Reply
        </button>
      `;

      card.innerHTML = content;
      card.querySelector('button').addEventListener('click', () => openReplyModal(ticket.id));
      ticketList.appendChild(card);
    });
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

  const filterTickets = (searchTerm) => {
    const filtered = allTickets.filter(ticket =>
      ticket.subject.toLowerCase().includes(searchTerm) ||
      ticket.message.toLowerCase().includes(searchTerm)
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