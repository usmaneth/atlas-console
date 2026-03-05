import { type GatewayConfig, type GatewayMessagePayload, type GatewayEventHandler } from "./types";
import { type ConnectionStatus } from "@/lib/types";

const MAX_RECONNECT_DELAY = 30000;
const INITIAL_RECONNECT_DELAY = 1000;

export class OpenClawClient {
  private ws: WebSocket | null = null;
  private config: GatewayConfig;
  private reconnectDelay = INITIAL_RECONNECT_DELAY;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Map<string, Set<GatewayEventHandler>>();
  private statusListeners = new Set<(status: ConnectionStatus) => void>();
  private _status: ConnectionStatus = "disconnected";
  private shouldReconnect = true;

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
        if (this.config.token) {
          this.send({ type: "auth", token: this.config.token });
        }
        this.setStatus("connected");
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as GatewayMessagePayload;
          this.emit(data.type, data);
          this.emit("*", data);
        } catch {
          // ignore malformed messages
        }
      };

      this.ws.onclose = () => {
        this.setStatus("disconnected");
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
    this.ws?.close();
    this.ws = null;
    this.setStatus("disconnected");
  }

  send(message: GatewayMessagePayload): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  on(type: string, handler: GatewayEventHandler): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler);
    return () => {
      this.listeners.get(type)?.delete(handler);
    };
  }

  onStatusChange(handler: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(handler);
    return () => {
      this.statusListeners.delete(handler);
    };
  }

  private setStatus(status: ConnectionStatus): void {
    this._status = status;
    this.statusListeners.forEach((handler) => handler(status));
  }

  private emit(type: string, message: GatewayMessagePayload): void {
    this.listeners.get(type)?.forEach((handler) => handler(message));
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
