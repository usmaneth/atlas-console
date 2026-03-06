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
import type {
  GatewayStatus,
  GatewaySession,
  ChannelAccount,
  ChannelsStatusResult,
  ChatEventPayload,
} from "./types";

interface OpenClawContextValue {
  client: OpenClawClient | null;
  status: ConnectionStatus;
  messages: ChatMessage[];
  activity: ActivityEvent[];
  streamingContent: string | null;
  gatewayInfo: GatewayStatus | null;
  sessions: GatewaySession[];
  channels: ChannelAccount[];
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
  const [channels, setChannels] = useState<ChannelAccount[]>([]);
  const sessionKeyRef = useRef<string>(SESSION_KEY);

  useEffect(() => {
    // Resolve WS URL: use env var, or auto-detect from browser location
    let url = process.env.NEXT_PUBLIC_GATEWAY_URL || "";
    const token = process.env.NEXT_PUBLIC_GATEWAY_TOKEN || "";

    if (!url && typeof window !== "undefined") {
      const host = window.location.hostname;
      const isLocal = host === "localhost" || host === "127.0.0.1";
      url = isLocal ? "ws://127.0.0.1:18789" : `ws://${host}:18790`;
    }
    if (!url) url = "ws://localhost:18789";

    console.log("[OpenClaw] Provider init — url:", url, "token:", token ? `set (${token.slice(0, 6)}...)` : "MISSING");

    const client = new OpenClawClient({ url, token });
    clientRef.current = client;

    const unsubStatus = client.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    // Listen for chat events
    const unsubChat = client.on("chat", (payload) => {
      const chatEvent = payload as unknown as ChatEventPayload;
      const { state, message: msg } = chatEvent;

      if (state === "delta") {
        const text = msg?.content ?? "";
        if (text) {
          setStreamingContent((prev) => (prev ?? "") + text);
        }
      } else if (state === "final") {
        setStreamingContent((prev) => {
          const finalContent = prev ?? msg?.content ?? "";
          if (finalContent) {
            const chatMsg: ChatMessage = {
              id: chatEvent.runId || crypto.randomUUID(),
              role: "atlas",
              content: finalContent,
              timestamp: new Date(),
            };
            setMessages((msgs) => [...msgs, chatMsg]);
          }
          return null;
        });
      } else if (state === "aborted") {
        setStreamingContent(null);
      } else if (state === "error") {
        setStreamingContent(null);
        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "atlas",
          content: `Error: ${chatEvent.errorMessage || "Unknown error"}`,
          timestamp: new Date(),
        };
        setMessages((msgs) => [...msgs, errorMsg]);
      }
    });

    // Listen for all gateway events for activity feed
    const unsubAll = client.on("*", (raw) => {
      const eventName = raw.event as string | undefined;
      const payload = raw.payload as Record<string, unknown> | undefined;
      if (!eventName || eventName === "chat" || eventName === "connect.challenge") return;

      const d = payload ?? raw;
      const event: ActivityEvent = {
        id: crypto.randomUUID(),
        type: mapActivityType(d.type as string),
        integration: mapIntegration(eventName, d.integration as string),
        title: (d.title as string) || (d.text as string) || eventName,
        description: d.description as string | undefined,
        timestamp: new Date(),
        metadata: d.metadata as Record<string, unknown> | undefined,
      };
      setActivity((prev) => [event, ...prev].slice(0, 200));
    });

    // Connect and load initial data from hello-ok snapshot
    client.connect().then((hello) => {
      const { snapshot, protocol, features } = hello;

      // Use session key from snapshot defaults if available
      if (snapshot.sessionDefaults?.mainKey) {
        sessionKeyRef.current = snapshot.sessionDefaults.mainKey;
      }

      setGatewayInfo({
        uptimeMs: snapshot.uptimeMs,
        protocol,
        features,
        presence: snapshot.presence,
        health: snapshot.health,
        sessionDefaults: snapshot.sessionDefaults,
        authMode: snapshot.authMode,
      });

      // Fetch sessions
      client.request("sessions.list", {
        limit: 50,
        includeDerivedTitles: true,
        includeLastMessage: true,
      }).then((res) => {
        const data = res as Record<string, unknown>;
        const list = (data.sessions ?? data.list ?? data) as Record<string, unknown>[];
        if (Array.isArray(list)) {
          setSessions(list.map((s) => ({
            id: (s.id as string) || "",
            key: (s.key as string) || (s.sessionKey as string) || "",
            agent: s.agent as string | undefined,
            createdAt: s.createdAt as string | undefined,
            derivedTitle: s.derivedTitle as string | undefined,
            lastMessage: s.lastMessage as string | undefined,
          })));
        }
      }).catch(() => {});

      // Fetch channels
      client.request("channels.status", { probe: true }).then((res) => {
        const data = res as unknown as ChannelsStatusResult;
        if (data.channelAccounts) {
          const accounts: ChannelAccount[] = [];
          for (const [channelType, acctArray] of Object.entries(data.channelAccounts)) {
            const arr = Array.isArray(acctArray) ? acctArray : [acctArray];
            for (const acct of arr) {
              accounts.push({
                ...acct,
                channelType,
                accountId: acct.accountId || "default",
                label: data.channelLabels?.[channelType] || channelType,
              });
            }
          }
          setChannels(accounts);
        }
      }).catch(() => {});

      // Fetch chat history
      client.request("chat.history", {
        sessionKey: sessionKeyRef.current,
        limit: 100,
      }).then((res) => {
        const data = res as Record<string, unknown>;
        const historyList = (data.messages ?? data.history ?? data) as Record<string, unknown>[];
        if (Array.isArray(historyList)) {
          const historyMessages: ChatMessage[] = historyList.map((m, i) => ({
            id: (m.id as string) || `hist-${i}`,
            role: (m.role as string) === "user" ? "user" as const : "atlas" as const,
            content: (m.content as string) || (m.text as string) || "",
            timestamp: m.timestamp ? new Date(m.timestamp as string) : new Date(),
          }));
          setMessages(historyMessages);
        }
      }).catch(() => {});

    }).catch((err) => {
      console.error("[OpenClaw] Connect failed:", err);
    });

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
    client.request("chat.send", {
      sessionKey: sessionKeyRef.current,
      message: content,
      idempotencyKey: crypto.randomUUID(),
    }).catch(() => {});
  }, []);

  const abortChat = useCallback(() => {
    const client = clientRef.current;
    if (!client) return;
    client.request("chat.abort", { sessionKey: sessionKeyRef.current }).catch(() => {});
    setStreamingContent(null);
  }, []);

  const refreshStatus = useCallback(() => {
    // Status comes from hello-ok snapshot; re-read from client
    const client = clientRef.current;
    if (!client?.hello) return;
    const { snapshot, protocol, features } = client.hello;
    setGatewayInfo({
      uptimeMs: snapshot.uptimeMs,
      protocol,
      features,
      presence: snapshot.presence,
      health: snapshot.health,
      sessionDefaults: snapshot.sessionDefaults,
      authMode: snapshot.authMode,
    });
  }, []);

  const refreshSessions = useCallback(() => {
    clientRef.current?.request("sessions.list", {
      limit: 50,
      includeDerivedTitles: true,
      includeLastMessage: true,
    }).then((res) => {
      const data = res as Record<string, unknown>;
      const list = (data.sessions ?? data.list ?? data) as Record<string, unknown>[];
      if (Array.isArray(list)) {
        setSessions(list.map((s) => ({
          id: (s.id as string) || "",
          key: (s.key as string) || (s.sessionKey as string) || "",
          agent: s.agent as string | undefined,
          createdAt: s.createdAt as string | undefined,
          derivedTitle: s.derivedTitle as string | undefined,
          lastMessage: s.lastMessage as string | undefined,
        })));
      }
    }).catch(() => {});
  }, []);

  const refreshChannels = useCallback(() => {
    clientRef.current?.request("channels.status", { probe: true }).then((res) => {
      const data = res as unknown as ChannelsStatusResult;
      if (data.channelAccounts) {
        const accounts: ChannelAccount[] = [];
        for (const [channelType, acctArray] of Object.entries(data.channelAccounts)) {
          const arr = Array.isArray(acctArray) ? acctArray : [acctArray];
          for (const acct of arr) {
            accounts.push({
              ...acct,
              channelType,
              accountId: acct.accountId || "default",
              label: data.channelLabels?.[channelType] || channelType,
            });
          }
        }
        setChannels(accounts);
      }
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
