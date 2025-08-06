// utils/sms.js
const twilio = require('twilio');

/**
 * Sends an SMS using provided Twilio credentials.
 * @param {Object} params
 * @param {string} params.sid - Twilio Account SID
 * @param {string} params.authToken - Twilio Auth Token
 * @param {string} params.from - Twilio phone number
 * @param {string} params.to - Recipient phone number
 * @param {string} params.message - SMS content
 */
async function sendSMS({ sid, authToken, from, to, message }) {
  if (!sid || !authToken || !from || !to || !message) {
    throw new Error('Missing SMS parameters');
  }

  const client = twilio(sid, authToken);

  try {
    return await client.messages.create({
      body: message,
      from,
      to,
    });
  } catch (error) {
    console.error('❌ SMS send failed:', error.message);
    throw error;
  }
}

module.exports = { sendSMS };
