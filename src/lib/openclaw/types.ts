export interface GatewayConfig {
  url: string;
  token?: string;
}

export interface GatewayMessagePayload {
  type: string;
  [key: string]: unknown;
}

export type GatewayEventHandler = (message: GatewayMessagePayload) => void;
