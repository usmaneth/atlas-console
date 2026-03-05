"use client";

import { useState, useRef, useEffect } from "react";
import { useMessages } from "@/lib/openclaw/hooks";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageSquare, Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function ChatPage() {
  const { messages, send } = useMessages();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      {/* Messages */}
      <ScrollArea className="flex-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-32 text-muted-foreground">
            <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mb-6">
              <MessageSquare className="h-8 w-8 opacity-40" />
            </div>
            <p className="text-base font-medium">Start a conversation with Atlas</p>
            <p className="text-sm mt-2 text-muted-foreground/60">
              Ask anything — code reviews, research, planning, or just chat.
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto py-6 space-y-1">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`group flex gap-3 px-4 py-4 rounded-lg transition-colors ${
                  msg.role === "user"
                    ? "bg-transparent"
                    : "bg-secondary/40"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-emerald-500/15 text-emerald-400"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="h-3.5 w-3.5" />
                  ) : (
                    <Bot className="h-3.5 w-3.5" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-foreground/80">
                      {msg.role === "user" ? "You" : "Atlas"}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground/50">
                      {msg.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none prose-p:my-1 prose-pre:my-2 prose-code:text-emerald-400 prose-code:bg-secondary prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                    <ReactMarkdown
                      components={{
                        code({ className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || "");
                          const codeString = String(children).replace(/\n$/, "");
                          if (match) {
                            return (
                              <div className="relative group/code">
                                <div className="flex items-center justify-between px-4 py-1.5 bg-[oklch(0.13_0_0)] rounded-t-lg border border-b-0 border-border">
                                  <span className="text-[10px] font-mono text-muted-foreground uppercase">
                                    {match[1]}
                                  </span>
                                </div>
                                <SyntaxHighlighter
                                  style={oneDark}
                                  language={match[1]}
                                  PreTag="div"
                                  customStyle={{
                                    margin: 0,
                                    borderRadius: "0 0 0.5rem 0.5rem",
                                    fontSize: "12px",
                                    background: "oklch(0.15 0 0)",
                                    border: "1px solid oklch(0.25 0 0)",
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
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input Bar */}
      <div className="border-t border-border p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3 bg-secondary rounded-xl px-4 py-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Message Atlas..."
              rows={1}
              className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground/50 focus:outline-none resize-none max-h-40 leading-relaxed"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-30 transition-opacity shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/40 mt-2 text-center">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
