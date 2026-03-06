// Standalone WS proxy — runs on port 3002, proxies to gateway on 18789
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

const PORT = 3002;
const GATEWAY_URL = "ws://127.0.0.1:18789";

const server = createServer((req, res) => {
  // Health check endpoint
  res.writeHead(200, { 
    "Content-Type": "text/plain",
    "Access-Control-Allow-Origin": "*",
  });
  res.end("ws-proxy ok");
});

const wss = new WebSocketServer({ server });

wss.on("connection", (clientWs, req) => {
  console.log("[WS Proxy] Browser connected from:", req.headers.origin);

  const gwWs = new WebSocket(GATEWAY_URL, {
    headers: { origin: req.headers.origin || "http://187.124.91.6:3001" },
  });

  gwWs.on("open", () => {
    console.log("[WS Proxy] Gateway connected");
  });

  clientWs.on("message", (data) => {
    if (gwWs.readyState === WebSocket.OPEN) gwWs.send(data);
  });

  gwWs.on("message", (data) => {
    if (clientWs.readyState === WebSocket.OPEN) clientWs.send(data);
  });

  clientWs.on("close", () => gwWs.close());
  gwWs.on("close", () => clientWs.close());
  clientWs.on("error", (e) => { console.error("[WS Proxy] Client err:", e.message); gwWs.close(); });
  gwWs.on("error", (e) => { console.error("[WS Proxy] GW err:", e.message); clientWs.close(); });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[WS Proxy] Listening on 0.0.0.0:${PORT} → ${GATEWAY_URL}`);
});
