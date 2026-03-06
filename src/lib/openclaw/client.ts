import type {
  GatewayConfig,
  GatewayEventHandler,
  GatewayResponse,
  GatewayEvent,
  HelloOkPayload,
} from "./types";
import { type ConnectionStatus } from "@/lib/types";

const MAX_RECONNECT_DELAY = 30000;
const INITIAL_RECONNECT_DELAY = 1000;

interface PendingRequest {
  resolve: (value: Record<string, unknown>) => void;
  reject: (reason: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class OpenClawClient {
  private ws: WebSocket | null = null;
  private config: GatewayConfig;
  private reconnectDelay = INITIAL_RECONNECT_DELAY;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private eventListeners = new Map<string, Set<GatewayEventHandler>>();
  private statusListeners = new Set<(status: ConnectionStatus) => void>();
  private _status: ConnectionStatus = "disconnected";
  private shouldReconnect = true;
  private requestId = 0;
  private pending = new Map<string, PendingRequest>();
  private REQUEST_TIMEOUT = 15000;
  private helloPayload: HelloOkPayload | null = null;
  private connectResolve: ((payload: HelloOkPayload) => void) | null = null;
  private connectReject: ((err: Error) => void) | null = null;

  constructor(config: GatewayConfig) {
    this.config = config;
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  get hello(): HelloOkPayload | null {
    return this.helloPayload;
  }

  connect(): Promise<HelloOkPayload> {
    if (this.ws?.readyState === WebSocket.OPEN && this.helloPayload) {
      return Promise.resolve(this.helloPayload);
    }

    this.shouldReconnect = true;
    this.setStatus("connecting");

    return new Promise<HelloOkPayload>((resolve, reject) => {
      this.connectResolve = resolve;
      this.connectReject = reject;

      // Smart URL resolution: if configured URL fails, try alternative
      const url = this.resolveWsUrl();
      console.log("[OpenClaw WS] Connecting to:", url);

      try {
        this.ws = new WebSocket(url);

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as Record<string, unknown>;
            this.handleFrame(data);
          } catch {
            // ignore malformed
          }
        };

        this.ws.onclose = () => {
          this.setStatus("disconnected");
          this.rejectAllPending("Connection closed");
          if (this.connectReject) {
            this.connectReject(new Error("Connection closed before handshake"));
            this.connectResolve = null;
            this.connectReject = null;
          }
          this.scheduleReconnect();
        };

        this.ws.onerror = (e) => {
          console.error("[OpenClaw WS] Error:", e);
          this.setStatus("error");
        };
      } catch {
        this.setStatus("error");
        reject(new Error("Failed to create WebSocket"));
        this.connectResolve = null;
        this.connectReject = null;
        this.scheduleReconnect();
      }
    });
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.rejectAllPending("Disconnected");
    if (this.connectReject) {
      this.connectReject(new Error("Disconnected"));
      this.connectResolve = null;
      this.connectReject = null;
    }
    this.ws?.close();
    this.ws = null;
    this.setStatus("disconnected");
  }

  request(method: string, params?: Record<string, unknown>): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState !== WebSocket.OPEN) {
        reject(new Error("Not connected"));
        return;
      }

      const id = String(++this.requestId);
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Request ${method} timed out`));
      }, this.REQUEST_TIMEOUT);

      this.pending.set(id, { resolve, reject, timer });
      this.sendFrame({
        type: "req",
        id,
        method,
        params: params ?? {},
      });
    });
  }

  on(eventName: string, handler: GatewayEventHandler): () => void {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }
    this.eventListeners.get(eventName)!.add(handler);
    return () => {
      this.eventListeners.get(eventName)?.delete(handler);
    };
  }

  onStatusChange(handler: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(handler);
    return () => {
      this.statusListeners.delete(handler);
    };
  }

  private handleFrame(data: Record<string, unknown>): void {
    const frameType = data.type as string;

    if (frameType === "event") {
      this.handleEvent(data as unknown as GatewayEvent);
      return;
    }

    if (frameType === "res") {
      this.handleResponse(data as unknown as GatewayResponse);
      return;
    }
  }

  private handleEvent(event: GatewayEvent): void {
    const eventName = event.event;
    const payload = event.payload ?? {};

    if (eventName === "connect.challenge") {
      this.sendConnectRequest(payload);
      return;
    }

    // Emit by event name
    this.emit(eventName, payload);
    this.emit("*", { event: eventName, payload });
  }

  private handleResponse(res: GatewayResponse): void {
    const id = res.id;
    const pending = this.pending.get(id);

    if (!res.ok) console.error("[OpenClaw WS] Request failed:", JSON.stringify(res.error));

    // Even if no pending request, we might receive a connect payload
    if (res.ok && res.payload) {
      const payloadObj = res.payload as Record<string, unknown>;
      if (payloadObj.type === "hello-ok" || payloadObj.snapshot) {
        this.helloPayload = res.payload as unknown as HelloOkPayload;
        this.reconnectDelay = INITIAL_RECONNECT_DELAY;
        this.setStatus("connected");
        if (this.connectResolve) {
          this.connectResolve(this.helloPayload);
          this.connectResolve = null;
          this.connectReject = null;
        }
      }
    }

    if (!pending) return;

    this.pending.delete(id);
    clearTimeout(pending.timer);

    if (res.ok && res.payload) {
      pending.resolve(res.payload);
    } else {
      pending.reject(res.error ?? new Error("Request failed"));
    }
  }

  private sendConnectRequest(_challengePayload: Record<string, unknown>): void {
    const id = String(++this.requestId);

    const timer = setTimeout(() => {
      this.pending.delete(id);
      if (this.connectReject) {
        this.connectReject(new Error("Connect handshake timed out"));
        this.connectResolve = null;
        this.connectReject = null;
      }
    }, this.REQUEST_TIMEOUT);

    this.pending.set(id, {
      resolve: (payload) => {
        // hello-ok is handled in handleResponse
        void payload;
      },
      reject: (err) => {
        if (this.connectReject) {
          this.connectReject(err instanceof Error ? err : new Error(String(err)));
          this.connectResolve = null;
          this.connectReject = null;
        }
      },
      timer,
    });

    this.sendFrame({
      type: "req",
      id,
      method: "connect",
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: "webchat-ui",
          version: "1.0.0",
          platform: typeof navigator !== "undefined" ? navigator.platform : "web",
          mode: "webchat",
        },
        role: "operator",
        scopes: ["operator.read", "operator.write"],
        auth: { token: this.config.token },
      },
    });
  }

  private sendFrame(frame: Record<string, unknown>): void {
    this.ws?.send(JSON.stringify(frame));
  }

  private setStatus(status: ConnectionStatus): void {
    this._status = status;
    this.statusListeners.forEach((handler) => handler(status));
  }

  private emit(type: string, message: Record<string, unknown>): void {
    this.eventListeners.get(type)?.forEach((handler) => handler(message));
  }

  private rejectAllPending(reason: string): void {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error(reason));
      this.pending.delete(id);
    }
  }

  private resolveWsUrl(): string {
    if (typeof window === "undefined") return this.config.url;
    // nginx on port 3001 routes /ws to gateway at 127.0.0.1:18789
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/ws`;
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) return;

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {});
    }, this.reconnectDelay);

    this.reconnectDelay = Math.min(
      this.reconnectDelay * 2,
      MAX_RECONNECT_DELAY
    );
  }
}
