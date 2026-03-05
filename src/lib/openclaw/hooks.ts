"use client";

import { useContext } from "react";
import { OpenClawContext } from "./provider";

export function useGateway() {
  const { client, status } = useContext(OpenClawContext);
  return { client, status };
}

export function useMessages() {
  const { messages, sendMessage } = useContext(OpenClawContext);
  return { messages, send: sendMessage };
}

export function useActivity() {
  const { activity } = useContext(OpenClawContext);
  return { events: activity };
}

export function useStatus() {
  const { status } = useContext(OpenClawContext);
  return { status };
}
