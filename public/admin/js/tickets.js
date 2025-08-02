document.addEventListener('DOMContentLoaded', () => {
  const ticketList = document.getElementById('ticketList');
  const notifList = document.getElementById('notifList');
  const notifCount = document.getElementById('notifCount');
  const notifBtn = document.getElementById('notifBtn');
  const notifDropdown = document.getElementById('notifDropdown');
  const searchInput = document.getElementById('ticketSearch');
  const emptyState = document.getElementById('emptyState');

  // Modal elements
  const modal = document.getElementById('ticketModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalTextarea = document.getElementById('modalTextarea');
  const modalSubmit = document.getElementById('modalSubmit');
  const modalClose = document.getElementById('modalClose');

  let tickets = [];
  let editingTicketId = null;

  const socket = io();

  notifBtn.addEventListener('click', () => {
    notifDropdown.classList.toggle('hidden');
  });

  modalClose.addEventListener('click', () => modal.classList.add('hidden'));

  modalSubmit.addEventListener('click', () => {
    const text = modalTextarea.value.trim();
    if (!text) return;
    console.log(`[${modalTitle.textContent}] Ticket ${editingTicketId}: ${text}`);
    modal.classList.add('hidden');
    modalTextarea.value = '';
  });

  // Render all tickets
  function renderTickets() {
    const query = searchInput.value.toLowerCase();
    ticketList.innerHTML = '';

    const filtered = tickets.filter(t =>
      t.subject.toLowerCase().includes(query) ||
      t.message.toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
      emptyState.classList.remove('hidden');
      return;
    } else {
      emptyState.classList.add('hidden');
    }

    filtered.forEach(ticket => {
      const card = document.createElement('div');
      card.className = `bg-white p-4 rounded-xl shadow flex flex-col gap-2 border-l-4 ${
        ticket.status === 'new' ? 'border-blue-500' : 'border-gray-200'
      }`;

      card.innerHTML = `
        <div class="flex justify-between items-start">
          <div>
            <h3 class="text-lg font-semibold">${ticket.subject}</h3>
            <p class="text-sm text-gray-600">${ticket.message}</p>
          </div>
          <div class="flex gap-2">
            <button onclick="replyTicket('${ticket.id}')" class="text-blue-600 hover:underline text-sm">Reply</button>
            <button onclick="editTicket('${ticket.id}')" class="text-yellow-600 hover:underline text-sm">Edit</button>
            <button onclick="deleteTicket('${ticket.id}')" class="text-red-600 hover:underline text-sm">Delete</button>
          </div>
        </div>
      `;

      ticketList.appendChild(card);
    });
  }

  // Button handlers
  window.replyTicket = (id) => {
    editingTicketId = id;
    modalTitle.textContent = 'Reply to Ticket';
    modalTextarea.value = '';
    modal.classList.remove('hidden');
  };

  window.editTicket = (id) => {
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return;
    editingTicketId = id;
    modalTitle.textContent = 'Edit Ticket';
    modalTextarea.value = ticket.message;
    modal.classList.remove('hidden');
  };

  window.deleteTicket = (id) => {
    tickets = tickets.filter(t => t.id !== id);
    renderTickets();
  };

  // Socket event
  socket.on('new_ticket', (ticket) => {
    ticket.status = 'new';
    tickets.unshift(ticket);
    updateNotification(ticket);
    renderTickets();
  });

  function updateNotification(ticket) {
    const li = document.createElement('li');
    li.className = 'p-2 hover:bg-gray-100 text-sm';
    li.textContent = `New ticket: ${ticket.subject}`;
    notifList.prepend(li);
    notifCount.classList.remove('hidden');
    notifCount.textContent = parseInt(notifCount.textContent || 0) + 1;
  }

  // Search
  searchInput.addEventListener('input', () => {
    renderTickets();
  });

  // Initial fetch
  fetch('/api/tickets')
    .then(res => res.json())
    .then(data => {
      tickets = data.map(t => ({ ...t, status: 'read' }));
      renderTickets();
    });
});
