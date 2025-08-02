// routes/tickets.js

const express = require('express');
const router = express.Router();

// Temporary in-memory storage
let tickets = [
  {
    id: '1',
    subject: 'Login not working',
    message: 'I can’t log in with my email address.'
  },
  {
    id: '2',
    subject: 'Bug on dashboard',
    message: 'There’s a bug when I click "settings".'
  }
];

// GET all tickets
router.get('/', (req, res) => {
  res.json(tickets);
});

// POST a new ticket (with Socket.IO notification)
router.post('/', (req, res) => {
  const { subject, message } = req.body;
  const newTicket = {
    id: String(Date.now()),
    subject,
    message
  };

  tickets.unshift(newTicket);

  // Broadcast new ticket to all connected clients
  const io = req.app.get('io');
  io.emit('new_ticket', newTicket);

  res.status(201).json(newTicket);
});

module.exports = router;
