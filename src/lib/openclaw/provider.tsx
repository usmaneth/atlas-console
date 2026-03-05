"use client";

import {
  createContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { OpenClawClient } from "./client";
import {
  type ConnectionStatus,
  type ChatMessage,
  type ActivityEvent,
} from "@/lib/types";
import type { GatewayStatus, GatewaySession, ChannelStatus } from "./types";

interface OpenClawContextValue {
  client: OpenClawClient | null;
  status: ConnectionStatus;
  messages: ChatMessage[];
  activity: ActivityEvent[];
  streamingContent: string | null;
  gatewayInfo: GatewayStatus | null;
  sessions: GatewaySession[];
  channels: ChannelStatus[];
  sendMessage: (content: string) => void;
  abortChat: () => void;
  refreshStatus: () => void;
  refreshSessions: () => void;
  refreshChannels: () => void;
  requestMethod: (method: string, params?: Record<string, unknown>) => Promise<unknown>;
}

export const OpenClawContext = createContext<OpenClawContextValue>({
  client: null,
  status: "disconnected",
  messages: [],
  activity: [],
  streamingContent: null,
  gatewayInfo: null,
  sessions: [],
  channels: [],
  sendMessage: () => {},
  abortChat: () => {},
  refreshStatus: () => {},
  refreshSessions: () => {},
  refreshChannels: () => {},
  requestMethod: () => Promise.reject(new Error("No client")),
});

interface OpenClawProviderProps {
  children: ReactNode;
}

const SESSION_KEY = "atlas-console";

export function OpenClawProvider({ children }: OpenClawProviderProps) {
  const clientRef = useRef<OpenClawClient | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [gatewayInfo, setGatewayInfo] = useState<GatewayStatus | null>(null);
  const [sessions, setSessions] = useState<GatewaySession[]>([]);
  const [channels, setChannels] = useState<ChannelStatus[]>([]);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_GATEWAY_URL || "ws://localhost:18789";
    const token = process.env.NEXT_PUBLIC_GATEWAY_TOKEN;

    const client = new OpenClawClient({ url, token });
    clientRef.current = client;

    const unsubStatus = client.onStatusChange((newStatus) => {
      setStatus(newStatus);
      if (newStatus === "connected") {
        client.request("status").then((res) => {
          setGatewayInfo(res as GatewayStatus);
        }).catch(() => {});
        client.request("sessions.list").then((res) => {
          setSessions(Array.isArray(res) ? res as GatewaySession[] : []);
        }).catch(() => {});
        client.request("channels.status").then((res) => {
          setChannels(Array.isArray(res) ? res as ChannelStatus[] : []);
        }).catch(() => {});
        client.request("chat.history", { sessionKey: SESSION_KEY }).then((res) => {
          if (Array.isArray(res)) {
            const historyMessages: ChatMessage[] = res.map((m: Record<string, unknown>, i: number) => ({
              id: (m.id as string) || `hist-${i}`,
              role: (m.role as "user" | "atlas") || "atlas",
              content: (m.content as string) || (m.text as string) || "",
              timestamp: m.timestamp ? new Date(m.timestamp as string) : new Date(),
            }));
            setMessages(historyMessages);
          }
        }).catch(() => {});
      }
    });

    const unsubChat = client.on("chat", (payload) => {
      const type = payload.type as string | undefined;
      if (type === "chunk" || type === "delta") {
        const text = (payload.content as string) || (payload.text as string) || (payload.delta as string) || "";
        setStreamingContent((prev) => (prev ?? "") + text);
      } else if (type === "done" || type === "end" || type === "complete") {
        setStreamingContent((prev) => {
          if (prev) {
            const msg: ChatMessage = {
              id: (payload.id as string) || crypto.randomUUID(),
              role: "atlas",
              content: prev,
              timestamp: new Date(),
            };
            setMessages((msgs) => [...msgs, msg]);
          }
          return null;
        });
      } else {
        const content = (payload.content as string) || (payload.text as string) || "";
        if (content) {
          const msg: ChatMessage = {
            id: (payload.id as string) || crypto.randomUUID(),
            role: "atlas",
            content,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, msg]);
        }
      }
    });

    const unsubAll = client.on("*", (payload) => {
      const eventType = payload.event as string | undefined;
      if (eventType && eventType !== "chat") {
        const inner = payload.data as Record<string, unknown> | undefined;
        const d = inner ?? payload;
        const event: ActivityEvent = {
          id: crypto.randomUUID(),
          type: mapActivityType(d.type as string),
          integration: mapIntegration(eventType, d.integration as string),
          title: (d.title as string) || (d.text as string) || eventType,
          description: d.description as string | undefined,
          timestamp: new Date(),
          metadata: d.metadata as Record<string, unknown> | undefined,
        };
        setActivity((prev) => [event, ...prev].slice(0, 200));
      }
    });

    client.connect();

    return () => {
      unsubStatus();
      unsubChat();
      unsubAll();
      client.disconnect();
    };
  }, []);

  const sendMessage = useCallback((content: string) => {
    const client = clientRef.current;
    if (!client) return;

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);
    client.send("chat.send", { text: content, sessionKey: SESSION_KEY });
  }, []);

  const abortChat = useCallback(() => {
    const client = clientRef.current;
    if (!client) return;
    client.send("chat.abort", { sessionKey: SESSION_KEY });
    setStreamingContent(null);
  }, []);

  const refreshStatus = useCallback(() => {
    clientRef.current?.request("status").then((res) => {
      setGatewayInfo(res as GatewayStatus);
    }).catch(() => {});
  }, []);

  const refreshSessions = useCallback(() => {
    clientRef.current?.request("sessions.list").then((res) => {
      setSessions(Array.isArray(res) ? res as GatewaySession[] : []);
    }).catch(() => {});
  }, []);

  const refreshChannels = useCallback(() => {
    clientRef.current?.request("channels.status").then((res) => {
      setChannels(Array.isArray(res) ? res as ChannelStatus[] : []);
    }).catch(() => {});
  }, []);

  const requestMethod = useCallback(
    (method: string, params?: Record<string, unknown>) => {
      const client = clientRef.current;
      if (!client) return Promise.reject(new Error("No client"));
      return client.request(method, params);
    },
    []
  );

  return (
    <OpenClawContext.Provider
      value={{
        client: clientRef.current,
        status,
        messages,
        activity,
        streamingContent,
        gatewayInfo,
        sessions,
        channels,
        sendMessage,
        abortChat,
        refreshStatus,
        refreshSessions,
        refreshChannels,
        requestMethod,
      }}
    >
      {children}
    </OpenClawContext.Provider>
  );
}

function mapActivityType(type: string | undefined): ActivityEvent["type"] {
  if (type === "read" || type === "action" || type === "idea" || type === "alert") return type;
  return "action";
}

function mapIntegration(event: string, integration: string | undefined): ActivityEvent["integration"] {
  const valid = ["github", "slack", "notion", "discord", "system"] as const;
  if (integration && valid.includes(integration as typeof valid[number])) {
    return integration as ActivityEvent["integration"];
  }
  if (valid.includes(event as typeof valid[number])) {
    return event as ActivityEvent["integration"];
  }
  return "system";
}
