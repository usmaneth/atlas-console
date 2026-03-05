export interface GatewayConfig {
  url: string;
  token?: string;
}

export type GatewayEventHandler = (message: Record<string, unknown>) => void;

export interface GatewayStatus {
  uptime?: number;
  sessions?: number;
  agents?: number;
  version?: string;
}

export interface GatewaySession {
  id: string;
  key: string;
  agent?: string;
  createdAt?: string;
}

export interface ChannelStatus {
  name: string;
  type: string;
  status: "connected" | "disconnected" | "error";
  lastSync?: string;
}
