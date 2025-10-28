const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Persistent client ID per user
const clientIdFile = path.join(__dirname, 'client-id.txt');
let clientId;

if (fs.existsSync(clientIdFile)) {
  clientId = fs.readFileSync(clientIdFile, 'utf8');
} else {
  clientId = uuidv4();
  fs.writeFileSync(clientIdFile, clientId);
}

const MEASUREMENT_ID = 'G-N37W7P80N8';   // Your GA4 Measurement ID
const API_SECRET = '-4qlikfLRAWINWjj-1QWVg'; // Your API secret

function sendEvent(eventName, params = {}) {
  fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`, {
    method: 'POST',
    body: JSON.stringify({
      client_id: clientId,
      events: [{ name: eventName, params }]
    })
  }).catch(err => console.error('GA event error:', err));
}

module.exports = { sendEvent };
