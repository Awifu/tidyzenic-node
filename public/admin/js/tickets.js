document.addEventListener('DOMContentLoaded', () => {
  const socket = io();
  const ticketList = document.getElementById('ticketList');
  const notifBtn = document.getElementById('notifBtn');
  const notifCount = document.getElementById('notifCount');
  const notifDropdown = document.getElementById('notifDropdown');
  const notifList = document.getElementById('notifList');
  const searchInput = document.getElementById('ticketSearch');
  const emptyState = document.getElementById('emptyState');

  let tickets = [];

  // Modal Elements
  const ticketModal = document.getElementById('ticketModal');
  const modalClose = document.getElementById('modalClose');
  const modalTitle = document.getElementById('modalTitle');
  const modalTextarea = document.getElementById('modalTextarea');
  const modalSubmit = document.getElementById('modalSubmit');

  let currentTicketId = null;
  let isEditing = false;

  // 🔁 Fetch & render tickets
  async function loadTickets() {
    try {
      const res = await fetch('/api/tickets');
      const data = await res.json();
      tickets = data.tickets;
      renderTickets(tickets);
    } catch (err) {
      console.error('Failed to load tickets:', err);
    }
  }

  function renderTickets(ticketArray) {
    ticketList.innerHTML = '';
    if (!ticketArray.length) {
      emptyState.classList.remove('hidden');
      return;
    }
    emptyState.classList.add('hidden');

    ticketArray.forEach(ticket => {
      const card = document.createElement('div');
      card.className = 'bg-white p-5 rounded-lg shadow-md border relative';

      card.innerHTML = `
        <h3 class="text-lg font-bold text-blue-700 mb-1">${ticket.subject}</h3>
        <p class="text-gray-700 mb-2">${ticket.message}</p>
        <div class="text-xs text-gray-500 mb-2">#${ticket.id} · ${new Date(ticket.created_at).toLocaleString()}</div>
        <div class="flex gap-2 text-sm">
          <button data-id="${ticket.id}" class="replyBtn text-blue-600 hover:underline">Reply</button>
          <button data-id="${ticket.id}" data-subject="${ticket.subject}" data-message="${ticket.message}" class="editBtn text-yellow-600 hover:underline">Edit</button>
          <button data-id="${ticket.id}" class="deleteBtn text-red-600 hover:underline">Delete</button>
        </div>
      `;

      ticketList.appendChild(card);
    });
  }

  // 🔍 Real-time search
  searchInput.addEventListener('input', () => {
    const keyword = searchInput.value.toLowerCase();
    const filtered = tickets.filter(t =>
      t.subject.toLowerCase().includes(keyword) ||
      t.message.toLowerCase().includes(keyword)
    );
    renderTickets(filtered);
  });

  // 🛎️ Notification dropdown
  notifBtn.addEventListener('click', () => {
    notifDropdown.classList.toggle('hidden');
  });

  // 💡 Reply or Edit modal open
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('replyBtn')) {
      currentTicketId = e.target.dataset.id;
      isEditing = false;
      modalTitle.textContent = 'Reply to Ticket';
      modalTextarea.value = '';
      ticketModal.classList.remove('hidden');
    }

    if (e.target.classList.contains('editBtn')) {
      currentTicketId = e.target.dataset.id;
      isEditing = true;
      modalTitle.textContent = 'Edit Ticket';
      modalTextarea.value = e.target.dataset.message;
      ticketModal.classList.remove('hidden');
    }

    if (e.target.classList.contains('deleteBtn')) {
      const id = e.target.dataset.id;
      if (confirm('Are you sure you want to delete this ticket?')) {
        deleteTicket(id);
      }
    }
  });

  modalClose.addEventListener('click', () => ticketModal.classList.add('hidden'));

  // 💬 Modal Submit: Reply or Edit
  modalSubmit.addEventListener('click', async () => {
    const message = modalTextarea.value.trim();
    if (!message) return;

    if (isEditing) {
      const subject = prompt('Enter new subject:', tickets.find(t => t.id == currentTicketId)?.subject || '');
      if (!subject) return;
      await updateTicket(currentTicketId, subject, message);
    } else {
      await sendReply(currentTicketId, message);
    }

    ticketModal.classList.add('hidden');
    await loadTickets();
  });

  // 📡 Send reply
  async function sendReply(ticketId, message) {
    try {
      await fetch(`/api/tickets/${ticketId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, admin_id: 1 }) // replace with session user ID
      });
    } catch (err) {
      console.error('Reply failed:', err);
    }
  }

  // ✏️ Update ticket
  async function updateTicket(id, subject, message) {
    try {
      await fetch(`/api/tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message })
      });
    } catch (err) {
      console.error('Update failed:', err);
    }
  }

  // 🗑️ Delete ticket
  async function deleteTicket(id) {
    try {
      await fetch(`/api/tickets/${id}`, { method: 'DELETE' });
      await loadTickets();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }

  // 🧨 Real-time ticket push
  socket.on('new_ticket', ticket => {
    notifCount.textContent = parseInt(notifCount.textContent) + 1;
    notifCount.classList.remove('hidden');

    const li = document.createElement('li');
    li.className = 'p-3 hover:bg-gray-100 cursor-pointer';
    li.textContent = `${ticket.subject}`;
    li.addEventListener('click', () => {
      searchInput.value = ticket.subject;
      notifDropdown.classList.add('hidden');
      notifCount.classList.add('hidden');
      renderTickets([ticket]);
    });

    notifList.prepend(li);
    tickets.unshift(ticket);
    renderTickets(tickets);
  });

  // Initial load
  loadTickets();
});
