// public/admin/js/tickets.js

document.addEventListener('DOMContentLoaded', () => {
  const notifBtn = document.getElementById('notifBtn');
  const notifDropdown = document.getElementById('notifDropdown');
  const notifList = document.getElementById('notifList');
  const notifCount = document.getElementById('notifCount');
  const ticketList = document.getElementById('ticketList');

  const socket = io(); // Connect to backend

  notifBtn.addEventListener('click', () => {
    notifDropdown.classList.toggle('hidden');
  });

  // Fetch existing tickets
  fetch('/api/tickets')
    .then(res => res.json())
    .then(tickets => {
      tickets.forEach(addTicketToList);
    });

  socket.on('new_ticket', (ticket) => {
    addTicketToList(ticket);
    addNotification(ticket);
  });

  function addNotification(ticket) {
    const li = document.createElement('li');
    li.className = 'p-2 hover:bg-gray-100';
    li.textContent = `New ticket: ${ticket.subject}`;
    notifList.prepend(li);
    notifCount.classList.remove('hidden');
    notifCount.textContent = parseInt(notifCount.textContent || 0) + 1;
  }

  function addTicketToList(ticket) {
    const div = document.createElement('div');
    div.className = 'bg-white p-4 rounded shadow';

    div.innerHTML = `
      <div class="flex justify-between items-center">
        <h2 class="font-semibold text-lg">${ticket.subject}</h2>
        <div class="space-x-2">
          <button class="text-blue-500 hover:underline" onclick="editTicket('${ticket.id}')">Edit</button>
          <button class="text-green-500 hover:underline" onclick="replyTicket('${ticket.id}')">Reply</button>
          <button class="text-red-500 hover:underline" onclick="deleteTicket('${ticket.id}')">Delete</button>
        </div>
      </div>
      <p class="text-sm mt-1">${ticket.message}</p>
    `;

    ticketList.prepend(div);
  }

  window.editTicket = (id) => alert('Edit ticket ' + id);
  window.replyTicket = (id) => alert('Reply to ticket ' + id);
  window.deleteTicket = (id) => alert('Delete ticket ' + id);
});
