"use client";

import { useContext } from "react";
import { OpenClawContext } from "./provider";

export function useGateway() {
  const { client, status, gatewayInfo, refreshStatus, requestMethod } = useContext(OpenClawContext);
  return { client, status, gatewayInfo, refreshStatus, requestMethod };
}

export function useMessages() {
  const { messages, sendMessage, streamingContent, abortChat } = useContext(OpenClawContext);
  return { messages, send: sendMessage, streamingContent, abortChat };
}

export function useActivity() {
  const { activity } = useContext(OpenClawContext);
  return { events: activity };
}

export function useStatus() {
  const { status } = useContext(OpenClawContext);
  return { status };
}

export function useSessions() {
  const { sessions, refreshSessions } = useContext(OpenClawContext);
  return { sessions, refreshSessions };
}

export function useChannels() {
  const { channels, refreshChannels } = useContext(OpenClawContext);
  return { channels, refreshChannels };
}
