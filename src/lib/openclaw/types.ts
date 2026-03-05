export interface GatewayConfig {
  url: string;
  token?: string;
}

export type GatewayEventHandler = (message: Record<string, unknown>) => void;

// --- Protocol framing ---

export interface GatewayRequest {
  type: "req";
  id: string;
  method: string;
  params: Record<string, unknown>;
}

export interface GatewayResponse {
  type: "res";
  id: string;
  ok: boolean;
  payload?: Record<string, unknown>;
  error?: { code: string; message: string };
}

export interface GatewayEvent {
  type: "event";
  event: string;
  payload: Record<string, unknown>;
  seq?: number;
}

export type GatewayFrame = GatewayResponse | GatewayEvent;

// --- hello-ok snapshot ---

export interface HelloOkSnapshot {
  presence: PresenceEntry[];
  health: Record<string, unknown>;
  uptimeMs: number;
  sessionDefaults?: { agent?: string; mainKey?: string };
  authMode?: string;
}

export interface PresenceEntry {
  deviceId: string;
  role: string;
  connectedAt?: string;
}

export interface HelloOkPayload {
  type: "hello-ok";
  protocol: number;
  snapshot: HelloOkSnapshot;
  features: { methods: string[]; events: string[] };
  policy: Record<string, unknown>;
}

// --- Gateway status (derived from hello-ok) ---

export interface GatewayStatus {
  uptimeMs: number;
  protocol: number;
  features: { methods: string[]; events: string[] };
  presence: PresenceEntry[];
  health: Record<string, unknown>;
  sessionDefaults?: { agent?: string; mainKey?: string };
  authMode?: string;
}

// --- Sessions ---

export interface GatewaySession {
  id: string;
  key: string;
  agent?: string;
  createdAt?: string;
  derivedTitle?: string;
  lastMessage?: string;
}

// --- Channels ---

export interface ChannelAccount {
  channelType: string;
  accountId: string;
  label?: string;
  connected: boolean;
  running: boolean;
  enabled: boolean;
  lastError?: string;
  meta?: Record<string, unknown>;
}

export interface ChannelsStatusResult {
  channelOrder: string[];
  channelLabels: Record<string, string>;
  channelAccounts: Record<string, ChannelAccount>;
  channelMeta?: Record<string, Record<string, unknown>>;
}

// --- Chat events ---

export interface ChatEventPayload {
  runId: string;
  sessionKey: string;
  seq: number;
  state: "delta" | "final" | "aborted" | "error";
  message?: {
    role?: string;
    content?: string;
    toolCalls?: unknown[];
  };
  errorMessage?: string;
  usage?: Record<string, unknown>;
}
