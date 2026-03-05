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

interface OpenClawContextValue {
  client: OpenClawClient | null;
  status: ConnectionStatus;
  messages: ChatMessage[];
  activity: ActivityEvent[];
  sendMessage: (content: string) => void;
}

export const OpenClawContext = createContext<OpenClawContextValue>({
  client: null,
  status: "disconnected",
  messages: [],
  activity: [],
  sendMessage: () => {},
});

interface OpenClawProviderProps {
  children: ReactNode;
}

export function OpenClawProvider({ children }: OpenClawProviderProps) {
  const clientRef = useRef<OpenClawClient | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    const url =
      process.env.NEXT_PUBLIC_GATEWAY_URL || "ws://localhost:18789";
    const token = process.env.NEXT_PUBLIC_GATEWAY_TOKEN;

    const client = new OpenClawClient({ url, token });
    clientRef.current = client;

    const unsubStatus = client.onStatusChange(setStatus);

    const unsubMessage = client.on("message", (payload) => {
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "atlas",
        content: (payload.content as string) || "",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, msg]);
    });

    const unsubActivity = client.on("activity", (payload) => {
      const event: ActivityEvent = {
        id: crypto.randomUUID(),
        type: (payload.activityType as ActivityEvent["type"]) || "action",
        integration:
          (payload.integration as ActivityEvent["integration"]) || "system",
        title: (payload.title as string) || "",
        description: payload.description as string | undefined,
        timestamp: new Date(),
        metadata: payload.metadata as Record<string, unknown> | undefined,
      };
      setActivity((prev) => [event, ...prev]);
    });

    client.connect();

    return () => {
      unsubStatus();
      unsubMessage();
      unsubActivity();
      client.disconnect();
    };
  }, []);

  const sendMessage = useCallback(
    (content: string) => {
      const client = clientRef.current;
      if (!client) return;

      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, msg]);
      client.send({ type: "message", content });
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
        sendMessage,
      }}
    >
      {children}
    </OpenClawContext.Provider>
  );
}
