// Custom server: Next.js + WebSocket gateway proxy on same port
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3001", 10);
const GATEWAY_URL = "ws://127.0.0.1:18789";

const app = next({ dev, hostname: "0.0.0.0", port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res, parse(req.url, true));
  });

  // Create a WebSocket server that doesn't attach to the http server
  const gatewayWss = new WebSocketServer({ noServer: true });

  gatewayWss.on("connection", (clientWs, req) => {
    console.log("[WS Proxy] Browser connected");

    const gwWs = new WebSocket(GATEWAY_URL, {
      headers: { origin: req.headers.origin || "http://187.124.91.6:3001" },
    });

    gwWs.on("open", () => console.log("[WS Proxy] Gateway connected"));

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

  // Intercept upgrade requests BEFORE Next.js
  server.on("upgrade", (req, socket, head) => {
    const { pathname } = parse(req.url);
    console.log("[Server] Upgrade:", pathname);

    if (pathname === "/api/gateway-ws") {
      gatewayWss.handleUpgrade(req, socket, head, (ws) => {
        gatewayWss.emit("connection", ws, req);
      });
    }
    // Don't destroy socket for other paths — let Next.js HMR handle them
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`> Atlas Console: http://0.0.0.0:${port}`);
    console.log(`> WS Proxy: ws://0.0.0.0:${port}/api/gateway-ws → ${GATEWAY_URL}`);
  });
});
