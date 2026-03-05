"use client";

import { useState } from "react";
import { useMessages } from "@/lib/openclaw/hooks";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageSquare } from "lucide-react";

export default function ChatPage() {
  const { messages, send } = useMessages();
  const [input, setInput] = useState("");

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    send(text);
    setInput("");
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      {/* Messages */}
      <ScrollArea className="flex-1 px-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-24 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mb-4 opacity-30" />
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs mt-1">
              Start a conversation with Atlas below
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <Card
                  className={`max-w-[75%] px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-[10px] mt-1 opacity-50 font-mono">
                    {msg.timestamp.toLocaleTimeString()}
                  </p>
                </Card>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Message Atlas..."
            className="flex-1 bg-secondary rounded-lg px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
