// utils/sms.js
const twilio = require('twilio');

function sendSMS({ sid, authToken, from }, to, message) {
  const client = twilio(sid, authToken);
  return client.messages.create({
    body: message,
    from,
    to,
  });
}

module.exports = { sendSMS };
