import { type GatewayConfig, type GatewayEventHandler } from "./types";
import { type ConnectionStatus } from "@/lib/types";

const MAX_RECONNECT_DELAY = 30000;
const INITIAL_RECONNECT_DELAY = 1000;

interface PendingRequest {
  resolve: (value: unknown) => void;
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
  private pending = new Map<number, PendingRequest>();
  private REQUEST_TIMEOUT = 15000;

  constructor(config: GatewayConfig) {
    this.config = config;
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.shouldReconnect = true;
    this.setStatus("connecting");

    try {
      this.ws = new WebSocket(this.config.url);

      this.ws.onopen = () => {
        this.reconnectDelay = INITIAL_RECONNECT_DELAY;
        this.sendRaw({
          method: "connect",
          params: { auth: { token: this.config.token } },
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch {
          // ignore malformed messages
        }
      };

      this.ws.onclose = () => {
        this.setStatus("disconnected");
        this.rejectAllPending("Connection closed");
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.setStatus("error");
      };
    } catch {
      this.setStatus("error");
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.rejectAllPending("Disconnected");
    this.ws?.close();
    this.ws = null;
    this.setStatus("disconnected");
  }

  request(method: string, params?: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState !== WebSocket.OPEN) {
        reject(new Error("Not connected"));
        return;
      }

      const id = ++this.requestId;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Request ${method} timed out`));
      }, this.REQUEST_TIMEOUT);

      this.pending.set(id, { resolve, reject, timer });
      this.sendRaw({ id, method, params });
    });
  }

  send(method: string, params?: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendRaw({ method, params });
    }
  }

  on(eventType: string, handler: GatewayEventHandler): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(handler);
    return () => {
      this.eventListeners.get(eventType)?.delete(handler);
    };
  }

  onStatusChange(handler: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(handler);
    return () => {
      this.statusListeners.delete(handler);
    };
  }

  private handleMessage(data: Record<string, unknown>): void {
    // Hello / connect response
    if (
      data.type === "hello" ||
      data.method === "hello" ||
      (data.id && data.result !== undefined)
    ) {
      if (this._status !== "connected") {
        this.setStatus("connected");
      }
    }

    // JSON-RPC response with matching pending request
    if (typeof data.id === "number" && this.pending.has(data.id)) {
      const pending = this.pending.get(data.id)!;
      this.pending.delete(data.id);
      clearTimeout(pending.timer);

      if (data.error) {
        pending.reject(data.error);
      } else {
        pending.resolve(data.result);
      }
      return;
    }

    // Event-style: { event: 'chat', data: { ... } }
    if (typeof data.event === "string") {
      const payload = (data.data as Record<string, unknown>) ?? data;
      this.emit(data.event, payload);
      this.emit("*", data);
      return;
    }

    // Fallback: emit by type
    if (typeof data.type === "string") {
      this.emit(data.type, data);
      this.emit("*", data);
    }
  }

  private sendRaw(message: Record<string, unknown>): void {
    this.ws?.send(JSON.stringify(message));
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

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) return;

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);

    this.reconnectDelay = Math.min(
      this.reconnectDelay * 2,
      MAX_RECONNECT_DELAY
    );
  }
}
