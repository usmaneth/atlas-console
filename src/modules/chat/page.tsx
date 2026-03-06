"use client";

import { useState, useRef, useEffect } from "react";
import { useMessages, useStatus } from "@/lib/openclaw/hooks";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Square, MessageSquare, Bot, User, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function ChatPage() {
  const { messages, send, streamingContent, abortChat } = useMessages();
  const { status } = useStatus();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    send(text);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }

  const isStreaming = streamingContent !== null;
  const isDisconnected = status !== "connected";

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      {isDisconnected && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-xs font-data">
          <Loader2 className="h-3 w-3 animate-spin" />
          {status === "connecting" ? "Connecting to gateway..." : "Gateway disconnected. Reconnecting..."}
        </div>
      )}

      <ScrollArea className="flex-1">
        {messages.length === 0 && !isStreaming ? (
          <div className="flex flex-col items-center justify-center h-full py-32 text-muted-foreground">
            <div className="h-16 w-16 rounded-2xl bg-warm-gold/15 flex items-center justify-center mb-6">
              <MessageSquare className="h-8 w-8 text-warm-gold opacity-60" />
            </div>
            <p className="font-serif text-xl">Start a conversation with Atlas</p>
            <p className="text-sm mt-2 text-muted-foreground/60">
              Ask anything — code reviews, research, planning, or just chat.
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto py-8 space-y-2">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} role={msg.role} content={msg.content} timestamp={msg.timestamp} />
            ))}
            {isStreaming && (
              <MessageBubble role="atlas" content={streamingContent} timestamp={new Date()} isStreaming />
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      <div className="border-t border-border/60 p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3 bg-secondary/60 rounded-xl px-4 py-3 border border-border/40">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={isDisconnected ? "Waiting for gateway..." : "Message Atlas..."}
              disabled={isDisconnected}
              rows={1}
              className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground/50 focus:outline-none resize-none max-h-40 leading-relaxed disabled:opacity-50"
            />
            {isStreaming ? (
              <button
                onClick={abortChat}
                className="p-2 rounded-xl bg-warm-gold/15 text-warm-gold hover:bg-warm-gold/25 transition-colors shrink-0"
              >
                <Square className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim() || isDisconnected}
                className="p-2 rounded-xl bg-warm-gold text-background hover:opacity-90 disabled:opacity-30 transition-opacity shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="font-data text-[10px] text-muted-foreground/40 mt-2 text-center">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  role,
  content,
  timestamp,
  isStreaming,
}: {
  role: "user" | "atlas";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}) {
  return (
    <div
      className={`group flex gap-4 px-5 py-5 rounded-xl transition-colors ${
        role === "user" ? "bg-transparent" : "bg-secondary/40"
      }`}
    >
      <div
        className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
          role === "user"
            ? "bg-primary text-primary-foreground"
            : "bg-warm-gold/15 text-warm-gold"
        }`}
      >
        {role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-medium text-foreground/80">
            {role === "user" ? "You" : "Atlas"}
          </span>
          <span className="font-data text-[10px] text-muted-foreground/50">
            {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          {isStreaming && (
            <span className="flex items-center gap-1 font-data text-[10px] text-warm-gold">
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
              streaming
            </span>
          )}
        </div>
        <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-pre:my-3 prose-code:text-warm-gold prose-code:bg-secondary prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
          <ReactMarkdown
            components={{
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || "");
                const codeString = String(children).replace(/\n$/, "");
                if (match) {
                  return (
                    <div className="relative group/code">
                      <div className="flex items-center justify-between px-4 py-1.5 bg-[oklch(0.14_0.005_60)] rounded-t-lg border border-b-0 border-border/60">
                        <span className="font-data text-[10px] text-muted-foreground uppercase">
                          {match[1]}
                        </span>
                      </div>
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{
                          margin: 0,
                          borderRadius: "0 0 0.75rem 0.75rem",
                          fontSize: "12px",
                          background: "oklch(0.16 0.005 60)",
                          border: "1px solid oklch(0.25 0.005 60)",
                          borderTop: "none",
                        }}
                      >
                        {codeString}
                      </SyntaxHighlighter>
                    </div>
                  );
                }
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
