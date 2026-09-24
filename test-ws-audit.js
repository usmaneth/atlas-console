const WebSocket = require('ws');
const ws = new WebSocket('ws://127.0.0.1:18789', {
  headers: {
    'Origin': 'http://127.0.0.1:3001'
  }
});

ws.on('open', () => {
  console.log("Connected to WS");
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log("<-", JSON.stringify(msg, null, 2));

  if (msg.event === 'connect.challenge') {
    const req = {
      type: 'req',
      id: '1',
      method: 'connect',
      params: {
        minProtocol: 3, maxProtocol: 3,
        client: { id: "test", version: "1.0", platform: "node", mode: "webchat" },
        auth: { token: process.env.ATLAS_TEST_TOKEN || '' }
      }
    };
    console.log("->", JSON.stringify(req));
    ws.send(JSON.stringify(req));
  }
});

ws.on('close', () => {
  console.log("Connection closed");
});

ws.on('error', (err) => {
  console.error("Error:", err);
});
