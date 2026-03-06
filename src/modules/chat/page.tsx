"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useMessages, useGateway, useSessions } from "@/lib/openclaw/hooks";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { ChatMessage } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Send,
  StopCircle,
  Hash,
  Plus,
  MessageSquare,
  Sparkles,
  Clock,
  ChevronDown,
  Copy,
  Check,
  Bot,
  User,
  Zap,
  Settings,
  MoreHorizontal,
} from "lucide-react";

/* ─── Channel System ─── */

interface Channel {
  id: string;
  name: string;
  icon: typeof Hash;
  description: string;
  sessionKey?: string;
  unread?: number;
}

const DEFAULT_CHANNELS: Channel[] = [
  { id: "general", name: "general", icon: Hash, description: "Talk to Atlas — your cofounder in the machine", sessionKey: "atlas-console" },
];

/* ─── Code Block with Copy ─── */

function CodeBlock({ language, children }: { language: string; children: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [children]);

  return (
    <div className="relative group my-3 rounded-xl overflow-hidden border border-border/30">
      <div className="flex items-center justify-between px-4 py-2 bg-secondary/80 border-b border-border/20">
        <span className="text-[10px] font-data text-muted-foreground/60 uppercase tracking-wider">{language || "code"}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-foreground transition-colors"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || "text"}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: "1rem",
          fontSize: "12px",
          lineHeight: "1.6",
          background: "transparent",
        }}
        className="!bg-[hsl(var(--secondary))]"
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

/* ─── Message Bubble ─── */

function MessageBubble({ message, isStreaming }: { message: ChatMessage; isStreaming?: boolean }) {
  const isUser = message.role === "user";
  const time = message.timestamp instanceof Date
    ? message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className={`group flex gap-3 px-6 py-3 hover:bg-accent/30 transition-colors ${isStreaming ? "animate-in fade-in-0 duration-300" : ""}`}>
      {/* Avatar */}
      <div className={`shrink-0 h-9 w-9 rounded-xl flex items-center justify-center mt-0.5 ${
        isUser
          ? "bg-soft-blue/15 text-soft-blue"
          : "bg-warm-gold/15 text-warm-gold"
      }`}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-sm font-semibold ${isUser ? "text-soft-blue" : "text-warm-gold"}`}>
            {isUser ? "Usman" : "Atlas"}
          </span>
          <span className="text-[10px] font-data text-muted-foreground/40">{time}</span>
          {isStreaming && (
            <span className="flex items-center gap-1 text-[10px] text-warm-gold/60">
              <span className="h-1.5 w-1.5 rounded-full bg-warm-gold/60 animate-pulse" />
              typing
            </span>
          )}
        </div>

        <div className="text-[13px] leading-relaxed text-foreground/90 prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-headings:font-serif prose-headings:tracking-tight prose-code:text-[12px] prose-code:font-data prose-pre:my-0 prose-pre:p-0 prose-pre:bg-transparent">
          <ReactMarkdown
            components={{
              code: ({ className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || "");
                const isInline = !match;
                if (isInline) {
                  return (
                    <code className="px-1.5 py-0.5 rounded-md bg-secondary text-[12px] font-data" {...props}>
                      {children}
                    </code>
                  );
                }
                return (
                  <CodeBlock language={match[1]}>
                    {String(children).replace(/\n$/, "")}
                  </CodeBlock>
                );
              },
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-soft-blue hover:underline">
                  {children}
                </a>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

/* ─── Typing Indicator ─── */

function TypingIndicator({ content }: { content: string }) {
  const fakeMessage: ChatMessage = {
    id: "streaming",
    role: "atlas",
    content,
    timestamp: new Date(),
  };
  return <MessageBubble message={fakeMessage} isStreaming />;
}

/* ─── Empty State ─── */

function EmptyChat() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="h-16 w-16 rounded-2xl bg-warm-gold/10 flex items-center justify-center mb-6">
        <Sparkles className="h-8 w-8 text-warm-gold/60" />
      </div>
      <h2 className="font-serif text-2xl font-semibold tracking-tight mb-2">Talk to Atlas</h2>
      <p className="text-sm text-muted-foreground/60 max-w-sm leading-relaxed">
        Your cofounder is listening. Ask anything — code reviews, product strategy, 
        architecture decisions, or just think out loud.
      </p>
      <div className="flex flex-wrap gap-2 mt-6 max-w-md justify-center">
        {["What PRs need my attention?", "Summarize today's Slack activity", "Review the Anuma roadmap", "What should I focus on today?"].map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => {
              const event = new CustomEvent("atlas-suggestion", { detail: suggestion });
              window.dispatchEvent(event);
            }}
            className="px-3 py-1.5 rounded-xl border border-border/30 text-[12px] text-muted-foreground/60 hover:text-foreground hover:border-warm-gold/30 hover:bg-warm-gold/5 transition-all"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Chat Page ─── */

export default function ChatPage() {
  const { messages, send, streamingContent, abortChat } = useMessages();
  const { status } = useGateway();
  const { sessions } = useSessions();
  const [input, setInput] = useState("");
  const [activeChannel, setActiveChannel] = useState("general");
  const [channels] = useState<Channel[]>(DEFAULT_CHANNELS);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll on new messages
  useEffect(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingContent, autoScroll]);

  // Focus input on mount + listen for suggestion clicks
  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: Event) => {
      const suggestion = (e as CustomEvent).detail;
      if (suggestion && status === "connected") {
        send(suggestion);
        setAutoScroll(true);
      }
    };
    window.addEventListener("atlas-suggestion", handler);
    return () => window.removeEventListener("atlas-suggestion", handler);
  }, [send, status]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || status !== "connected") return;
    send(text);
    setInput("");
    setAutoScroll(true);
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  }, [input, send, status]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Auto-resize textarea
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, []);

  const activeChannelData = channels.find((c) => c.id === activeChannel);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] -mt-4 -mx-8">
      {/* Channel Sidebar */}
      <div className="w-60 border-r border-border/30 flex flex-col bg-card/30">
        {/* Sidebar Header */}
        <div className="px-4 py-4 border-b border-border/20">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-sm font-semibold tracking-tight">Channels</h2>
            <button className="h-6 w-6 rounded-lg hover:bg-accent/50 flex items-center justify-center text-muted-foreground/50 hover:text-foreground transition-colors">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Channel List */}
        <ScrollArea className="flex-1 px-2 py-2">
          <div className="space-y-0.5">
            {channels.map((channel) => {
              const isActive = channel.id === activeChannel;
              const Icon = channel.icon;
              return (
                <button
                  key={channel.id}
                  onClick={() => setActiveChannel(channel.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${
                    isActive
                      ? "bg-warm-gold/10 text-foreground border border-warm-gold/15"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-warm-gold" : ""}`} />
                  <span className="truncate">{channel.name}</span>
                  {channel.unread && channel.unread > 0 && (
                    <Badge className="ml-auto h-5 min-w-[20px] px-1.5 bg-soft-blue text-white text-[10px]">
                      {channel.unread}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sessions */}
          {sessions.length > 0 && (
            <div className="mt-6">
              <h3 className="text-[10px] font-data uppercase tracking-wider text-muted-foreground/40 px-3 mb-2">Active Sessions</h3>
              <div className="space-y-0.5">
                {sessions.slice(0, 8).map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/30 transition-colors cursor-default"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/60 shrink-0" />
                    <span className="truncate">{session.derivedTitle || session.agent || session.key}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Connection Status */}
        <div className="px-4 py-3 border-t border-border/20">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${
              status === "connected" ? "bg-emerald-500" : status === "connecting" ? "bg-yellow-500 animate-pulse" : "bg-red-500"
            }`} />
            <span className="text-[11px] font-data text-muted-foreground/50 capitalize">{status}</span>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Channel Header */}
        <div className="px-6 py-3 border-b border-border/20 flex items-center gap-3">
          <Hash className="h-4 w-4 text-muted-foreground/50" />
          <div>
            <h2 className="text-sm font-semibold">{activeChannelData?.name || activeChannel}</h2>
            <p className="text-[11px] text-muted-foreground/40">{activeChannelData?.description}</p>
          </div>
          <div className="flex-1" />
          <button className="h-8 w-8 rounded-lg hover:bg-accent/50 flex items-center justify-center text-muted-foreground/40 hover:text-foreground transition-colors">
            <Settings className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto" ref={scrollAreaRef}>
          {messages.length === 0 && !streamingContent ? (
            <EmptyChat />
          ) : (
            <div className="py-4">
              {messages.map((msg, i) => (
                <MessageBubble key={msg.id || `msg-${i}`} message={msg} />
              ))}
              {streamingContent && <TypingIndicator content={streamingContent} />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="px-6 py-4 border-t border-border/20">
          <div className="relative flex items-end gap-3 bg-card/60 border border-border/30 rounded-2xl px-4 py-3 focus-within:border-warm-gold/30 focus-within:ring-1 focus-within:ring-warm-gold/20 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={status === "connected" ? `Message #${activeChannelData?.name || activeChannel}` : "Connecting to Atlas..."}
              disabled={status !== "connected"}
              rows={1}
              className="flex-1 bg-transparent text-[13px] placeholder:text-muted-foreground/30 resize-none border-none outline-none leading-relaxed max-h-[200px] disabled:opacity-50"
            />
            <div className="flex items-center gap-1 shrink-0">
              {streamingContent ? (
                <button
                  onClick={abortChat}
                  className="h-8 w-8 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 flex items-center justify-center transition-colors"
                  title="Stop generating"
                >
                  <StopCircle className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || status !== "connected"}
                  className="h-8 w-8 rounded-xl bg-warm-gold/15 text-warm-gold hover:bg-warm-gold/25 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground/30 mt-2 text-center font-data">
            {status === "connected" ? "Connected to Atlas Gateway • Enter to send, Shift+Enter for new line" : "Attempting to connect..."}
          </p>
        </div>
      </div>
    </div>
  );
}
