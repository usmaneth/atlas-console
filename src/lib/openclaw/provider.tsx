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

// uuid() only works on HTTPS — fallback for HTTP
function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return uuid();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

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

    // Extract text from gateway message content (can be string, array of blocks, or object)
    function extractText(content: unknown): string {
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        return content
          .map((block) => {
            if (typeof block === "string") return block;
            if (block?.type === "text") return block.text ?? "";
            if (block?.text) return block.text;
            return "";
          })
          .join("");
      }
      if (content && typeof content === "object") {
        const obj = content as Record<string, unknown>;
        if (obj.text) return String(obj.text);
        if (obj.content) return extractText(obj.content);
      }
      return "";
    }

    const client = new OpenClawClient({ url, token });
    clientRef.current = client;

    const unsubStatus = client.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    // Listen for chat events — only process events for our webchat session
    const unsubChat = client.on("chat", (payload) => {
      const chatEvent = payload as unknown as ChatEventPayload;
      const { state, message: msg } = chatEvent;

      // Only process events for our session
      const eventSession = (chatEvent as unknown as Record<string, unknown>).sessionKey as string | undefined;
      if (eventSession && eventSession !== sessionKeyRef.current) return;

      if (state === "delta") {
        const text = extractText(msg?.content ?? "");
        if (text) {
          setStreamingContent((prev) => (prev ?? "") + text);
        }
      } else if (state === "final") {
        setStreamingContent((prev) => {
          const finalContent = prev ?? extractText(msg?.content ?? "");
          // Skip system/internal messages
          if (!finalContent || finalContent.includes("HEARTBEAT_OK") || finalContent.startsWith("NO_REPLY")) {
            return null;
          }
          if (finalContent) {
            const chatMsg: ChatMessage = {
              id: chatEvent.runId || uuid(),
              role: "atlas",
              content: finalContent,
              timestamp: new Date(),
            };
            setMessages((msgs) => {
              // Deduplicate by ID
              if (msgs.some((m) => m.id === chatMsg.id)) return msgs;
              return [...msgs, chatMsg];
            });
          }
          return null;
        });
      } else if (state === "aborted") {
        setStreamingContent(null);
      } else if (state === "error") {
        setStreamingContent(null);
        const errorMsg: ChatMessage = {
          id: uuid(),
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
        id: uuid(),
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

      // Fetch chat history — filter out system messages, heartbeats, and internal events
      client.request("chat.history", {
        sessionKey: sessionKeyRef.current,
        limit: 100,
      }).then((res) => {
        const data = res as Record<string, unknown>;
        const historyList = (data.messages ?? data.history ?? data) as Record<string, unknown>[];
        if (Array.isArray(historyList)) {
          const seen = new Set<string>();
          const historyMessages: ChatMessage[] = [];
          for (let i = 0; i < historyList.length; i++) {
            const m = historyList[i];
            const role = (m.role as string) || "";
            // Skip system messages, tool calls, and internal events
            if (role === "system" || role === "tool") continue;
            const id = (m.id as string) || `hist-${i}`;
            if (seen.has(id)) continue;
            seen.add(id);
            const content = extractText(m.content ?? m.text ?? "");
            if (!content) continue;
            // Skip heartbeat prompts and system event injections
            if (content.includes("HEARTBEAT_OK")) continue;
            if (content.includes("Read HEARTBEAT.md")) continue;
            if (content.includes("System (untrusted)")) continue;
            if (content.startsWith("NO_REPLY")) continue;
            historyMessages.push({
              id,
              role: role === "user" ? "user" as const : "atlas" as const,
              content,
              timestamp: m.timestamp ? new Date(m.timestamp as string) : new Date(),
            });
          }
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
      id: uuid(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);
    client.request("chat.send", {
      sessionKey: sessionKeyRef.current,
      message: content,
      idempotencyKey: uuid(),
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
