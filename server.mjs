// Custom server that runs Next.js + WebSocket proxy on the same port
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3001", 10);
const GATEWAY_URL = "ws://127.0.0.1:18789";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // WebSocket proxy: /api/gateway-ws → gateway
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const { pathname } = parse(req.url);

    if (pathname === "/api/gateway-ws") {
      wss.handleUpgrade(req, socket, head, (clientWs) => {
        // Connect to the real gateway
        const gwWs = new WebSocket(GATEWAY_URL, {
          headers: {
            origin: `http://187.124.91.6:3001`,
          },
        });

        gwWs.on("open", () => {
          console.log("[WS Proxy] Connected to gateway");
        });

        // Proxy messages both ways
        clientWs.on("message", (data) => {
          if (gwWs.readyState === WebSocket.OPEN) {
            gwWs.send(data);
          }
        });

        gwWs.on("message", (data) => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(data);
          }
        });

        // Handle closes
        clientWs.on("close", () => {
          gwWs.close();
        });

        gwWs.on("close", () => {
          clientWs.close();
        });

        // Handle errors
        clientWs.on("error", (err) => {
          console.error("[WS Proxy] Client error:", err.message);
          gwWs.close();
        });

        gwWs.on("error", (err) => {
          console.error("[WS Proxy] Gateway error:", err.message);
          clientWs.close();
        });
      });
    } else {
      // Let Next.js handle HMR WebSocket upgrades
      // Don't destroy the socket — Next.js dev server needs it
    }
  });

  server.listen(port, hostname, () => {
    console.log(`> Atlas Console ready on http://${hostname}:${port}`);
    console.log(`> WS proxy: ws://${hostname}:${port}/api/gateway-ws → ${GATEWAY_URL}`);
  });
});
