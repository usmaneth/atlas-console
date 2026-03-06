export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export type AtlasState = "idle" | "thinking" | "working";

export interface GatewayMessage {
  type: string;
  [key: string]: unknown;
}

export interface ChatMessage {
  id: string;
  role: "user" | "atlas";
  content: string;
  timestamp: Date;
}

export interface ActivityEvent {
  id: string;
  type: "read" | "action" | "idea" | "alert";
  integration: "github" | "slack" | "notion" | "system" | "discord";
  title: string;
  description?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface IntegrationStatus {
  name: string;
  status: ConnectionStatus;
  lastSync?: Date;
}
