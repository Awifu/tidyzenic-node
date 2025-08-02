document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
  const ticketList = document.getElementById("ticketList");
  const notifCount = document.getElementById("notifCount");
  const notifList = document.getElementById("notifList");
  const notifDropdown = document.getElementById("notifDropdown");
  const notifBtn = document.getElementById("notifBtn");
  const searchInput = document.getElementById("ticketSearch");
  const emptyState = document.getElementById("emptyState");

  let tickets = [];

  // Toggle notification dropdown
  notifBtn.addEventListener("click", () => {
    notifDropdown.classList.toggle("hidden");
  });

  // Modal functionality
  const modal = document.getElementById("ticketModal");
  const modalClose = document.getElementById("modalClose");
  const modalSubmit = document.getElementById("modalSubmit");
  const modalTextarea = document.getElementById("modalTextarea");
  let currentTicketId = null;

  modalClose.addEventListener("click", () => (modal.classList.add("hidden")));
  modalSubmit.addEventListener("click", () => {
    if (currentTicketId && modalTextarea.value.trim()) {
      socket.emit("replyTicket", { id: currentTicketId, message: modalTextarea.value });
      modal.classList.add("hidden");
      modalTextarea.value = "";
    }
  });

  function renderTickets(filter = "") {
    ticketList.innerHTML = "";
    const filtered = tickets.filter(ticket =>
      ticket.subject.toLowerCase().includes(filter.toLowerCase()) ||
      ticket.message.toLowerCase().includes(filter.toLowerCase())
    );

    if (filtered.length === 0) {
      emptyState.classList.remove("hidden");
      return;
    } else {
      emptyState.classList.add("hidden");
    }

    filtered.forEach(ticket => {
      const card = document.createElement("div");
      card.className = "bg-white shadow-md rounded-lg p-4 border";

      card.innerHTML = `
        <div class="flex justify-between items-center">
          <div>
            <h3 class="text-lg font-semibold text-blue-700">${ticket.subject}</h3>
            <p class="text-sm text-gray-600">${ticket.message}</p>
          </div>
          <div class="flex space-x-2">
            <button class="text-sm px-3 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-700" data-reply="${ticket.id}">💬 Reply</button>
            <button class="text-sm px-3 py-1 rounded bg-yellow-100 hover:bg-yellow-200 text-yellow-700" data-edit="${ticket.id}">✏️ Edit</button>
            <button class="text-sm px-3 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700" data-delete="${ticket.id}">🗑 Delete</button>
          </div>
        </div>
      `;
      ticketList.appendChild(card);

      // Add events
      card.querySelector(`[data-reply="${ticket.id}"]`).addEventListener("click", () => {
        currentTicketId = ticket.id;
        modalTextarea.value = "";
        modal.classList.remove("hidden");
        modalTextarea.focus();
      });

      card.querySelector(`[data-edit="${ticket.id}"]`).addEventListener("click", () => {
        const newMsg = prompt("Edit message:", ticket.message);
        if (newMsg !== null) {
          socket.emit("editTicket", { id: ticket.id, message: newMsg });
        }
      });

      card.querySelector(`[data-delete="${ticket.id}"]`).addEventListener("click", () => {
        if (confirm("Are you sure you want to delete this ticket?")) {
          socket.emit("deleteTicket", ticket.id);
        }
      });
    });
  }

  // Live search
  searchInput.addEventListener("input", (e) => {
    renderTickets(e.target.value);
  });

  // Socket events
  socket.on("initialTickets", (data) => {
    tickets = data;
    renderTickets();
  });

  socket.on("newTicket", (ticket) => {
    tickets.unshift(ticket);
    renderTickets();

    const notifItem = document.createElement("li");
    notifItem.className = "p-2 text-sm";
    notifItem.textContent = `🆕 New Ticket: ${ticket.subject}`;
    notifList.prepend(notifItem);

    notifCount.classList.remove("hidden");
    notifCount.textContent = notifList.children.length;
  });

  socket.on("updateTicket", updated => {
    tickets = tickets.map(t => t.id === updated.id ? updated : t);
    renderTickets(searchInput.value);
  });

  socket.on("deleteTicket", id => {
    tickets = tickets.filter(t => t.id !== id);
    renderTickets(searchInput.value);
  });
});
