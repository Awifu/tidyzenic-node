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

  const renderReplies = (replies) => {
    if (!replies || !replies.length) return '';
    return `
      <div class="mt-3 space-y-2 border-t pt-2">
        ${replies.map(r => `
          <div class="text-sm bg-gray-50 p-2 rounded border">
            <strong class="text-blue-600">Admin:</strong> ${r.message}<br>
            <span class="text-xs text-gray-500">${new Date(r.created_at).toLocaleString()}</span>
          </div>
        `).join('')}
      </div>
    `;
  };

  const renderTickets = (tickets) => {
    ticketList.innerHTML = '';

    if (!tickets.length) {
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    tickets.forEach(ticket => {
      const card = document.createElement('div');
      card.className = 'bg-white rounded-xl p-5 shadow-md border animate-fade-in';

      const repliesHtml = renderReplies(ticket.replies);

      const content = `
        <div class="flex justify-between items-start">
          <div>
            <h3 class="text-lg font-bold text-blue-700">${ticket.subject}</h3>
            <p class="text-gray-700 mt-1">${ticket.message}</p>
            <p class="text-xs text-gray-500 mt-2">Status: <span class="font-semibold">${ticket.status}</span></p>
            ${repliesHtml}
          </div>
          <div class="space-y-2 text-right">
            <button class="replyBtn text-sm text-white bg-blue-600 px-3 py-1 rounded hover:bg-blue-700" data-id="${ticket.id}">💬 Reply</button>
            <button class="resolveBtn text-sm text-green-700 border border-green-600 px-3 py-1 rounded hover:bg-green-600 hover:text-white" data-id="${ticket.id}">✅ Resolved</button>
            <button class="deleteBtn text-sm text-red-600 border border-red-500 px-3 py-1 rounded hover:bg-red-600 hover:text-white" data-id="${ticket.id}">🗑 Delete</button>
          </div>
        </div>
      `;

      card.innerHTML = content;

      card.querySelector('.replyBtn').addEventListener('click', () => openReplyModal(ticket.id));
      card.querySelector('.resolveBtn').addEventListener('click', () => markResolved(ticket.id));
      card.querySelector('.deleteBtn').addEventListener('click', () => deleteTicket(ticket.id));

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

  const markResolved = async (ticketId) => {
    try {
      await fetch(`/api/tickets/${ticketId}/resolve`, { method: 'PUT' });
      fetchTickets();
    } catch (err) {
      console.error('Failed to mark resolved:', err);
    }
  };

  const deleteTicket = async (ticketId) => {
    if (!confirm('Delete this ticket?')) return;
    try {
      await fetch(`/api/tickets/${ticketId}`, { method: 'DELETE' });
      fetchTickets();
    } catch (err) {
      console.error('Failed to delete ticket:', err);
    }
  };

  const filterTickets = (searchTerm) => {
    const filtered = allTickets.filter(ticket =>
      ticket.subject.toLowerCase().includes(searchTerm) ||
      ticket.message.toLowerCase().includes(searchTerm)
    );
    renderTickets(filtered);
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

  modalClose.addEventListener('click', closeModal);
  searchInput.addEventListener('input', (e) => filterTickets(e.target.value.toLowerCase()));

  const socket = io();
  socket.on('new_ticket', (ticket) => {
    allTickets.unshift(ticket);
    renderTickets(allTickets);
  });

  fetchTickets();
});
