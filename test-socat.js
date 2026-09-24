const WebSocket = require('ws');
const ws = new WebSocket('ws://127.0.0.1:18790', {
  headers: {
    'Origin': 'http://127.0.0.1:3001'
  }
});
ws.on('open', () => console.log('Connected'));
ws.on('close', () => console.log('Closed'));
ws.on('error', (err) => console.log('Error:', err.message));
