// routes/sms.js

const express = require('express');
const router = express.Router();
const smsController = require('../controllers/smsController');

// Save or update Twilio credentials (with validation)
router.post('/settings', smsController.saveTwilioSettings);

module.exports = router;
