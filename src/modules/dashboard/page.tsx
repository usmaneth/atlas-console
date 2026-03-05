"use client";

import { useState, useEffect } from "react";
import { useGateway } from "@/lib/openclaw/hooks";
import { Badge } from "@/components/ui/badge";
import {
  GitPullRequest,
  Brain,
  MessageSquare,
  Github,
  FileText,
  Mail,
  Zap,
  Calendar,
  AlertTriangle,
  Bot,
} from "lucide-react";

interface DashboardProps {
  onNavigate?: (route: string) => void;
}

// --- Mock data ---

const agentData = [
  {
    id: "atlas",
    name: "Atlas",
    color: "bg-emerald-500",
    status: "active" as const,
    task: "Reviewing PR #248",
  },
  {
    id: "duke",
    name: "Duke",
    color: "bg-violet-500",
    status: "active" as const,
    task: "Dark mode toggle — ai-portal",
  },
  {
    id: "anuma",
    name: "Anuma",
    color: "bg-amber-500",
    status: "in-dev" as const,
    task: null,
  },
];

const priorityQueue = [
  {
    id: "1",
    title: "PR #248 needs your review",
    subtitle: "openclaw-gateway — websocket reconnect logic",
    urgency: "red" as const,
    time: "5m ago",
    icon: GitPullRequest,
  },
  {
    id: "2",
    title: "3 unread threads in #eng-general",
    subtitle: "Slack — architecture discussion, deploy blockers",
    urgency: "yellow" as const,
    time: "12m ago",
    icon: MessageSquare,
  },
  {
    id: "3",
    title: "Standup in 25 minutes",
    subtitle: "Daily sync — Google Meet",
    urgency: "yellow" as const,
    time: "in 25m",
    icon: Calendar,
  },
  {
    id: "4",
    title: "Notion OAuth token expired",
    subtitle: "Re-authenticate in Settings to restore sync",
    urgency: "red" as const,
    time: "2h ago",
    icon: AlertTriangle,
  },
];

const recentActivity = [
  { icon: GitPullRequest, color: "text-github", text: "Reviewed PR #247 — auth middleware refactor", time: "2m" },
  { icon: MessageSquare, color: "text-slack", text: "Summarized #eng-general (14 messages)", time: "8m" },
  { icon: Brain, color: "text-emerald-400", text: "Updated memory: architecture decisions", time: "15m" },
  { icon: Github, color: "text-github", text: "CI passed on atlas-console/main #389", time: "22m" },
  { icon: MessageSquare, color: "text-indigo-400", text: "Responded to @sarah in #design-feedback", time: "34m" },
  { icon: FileText, color: "text-notion", text: "Synced Sprint 12 task board from Notion", time: "41m" },
  { icon: GitPullRequest, color: "text-github", text: "Drafted review for PR #245 — rate limiting", time: "1h" },
  { icon: Brain, color: "text-emerald-400", text: "Indexed 3 new daily notes from journal", time: "1h" },
];

const integrations = [
  { name: "GitHub", status: "connected", icon: Github },
  { name: "Discord", status: "connected", icon: MessageSquare },
  { name: "Slack", status: "disconnected", icon: MessageSquare },
  { name: "Notion", status: "degraded", icon: FileText },
  { name: "Google", status: "connected", icon: Mail },
];

const quickActions = [
  { label: "Ask Atlas", icon: Bot, route: "/chat" },
  { label: "Review PRs", icon: GitPullRequest, route: "/activity" },
  { label: "Check Slack", icon: MessageSquare, route: "/activity" },
  { label: "Meeting Prep", icon: Calendar, route: "/chat" },
];

const urgencyBorder: Record<string, string> = {
  red: "border-l-red-500",
  yellow: "border-l-amber-400",
  green: "border-l-emerald-500",
};

function integrationDotColor(status: string): string {
  if (status === "connected") return "bg-emerald-500";
  if (status === "degraded") return "bg-amber-500";
  return "bg-red-500";
}

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="font-mono text-xs text-muted-foreground tabular-nums">
      {time.toLocaleTimeString("en-US", { hour12: false })}
    </span>
  );
}

export default function DashboardPage({ onNavigate }: DashboardProps) {
  const { status } = useGateway();

  return (
    <div className="space-y-4">
      {/* === Top Status Strip === */}
      <div className="flex items-center gap-4 px-1 py-1">
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${status === "connected" ? "bg-emerald-500" : status === "connecting" ? "bg-yellow-500 animate-pulse" : "bg-red-500"}`}
          />
          <span className="text-[11px] font-mono text-muted-foreground">
            Gateway
          </span>
        </div>
        <Badge variant="secondary" className="font-mono text-[10px] px-2 py-0">
          Atlas: idle
        </Badge>
        <Clock />
        <span className="text-[10px] font-mono text-muted-foreground/50">
          Uptime: 4d 7h 22m
        </span>
      </div>

      {/* === Main Grid: 60/40 === */}
      <div className="grid grid-cols-[1fr_0.67fr] gap-4">
        {/* ====== LEFT COLUMN ====== */}
        <div className="space-y-4">
          {/* Active Agents */}
          <section>
            <h3 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/60 mb-2 px-1">
              Active Agents
            </h3>
            <div className="flex gap-2">
              {agentData.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => onNavigate?.("/agents")}
                  className="flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border bg-card hover:border-muted-foreground/30 transition-colors text-left"
                >
                  <div
                    className={`h-7 w-7 rounded-lg ${agent.color} flex items-center justify-center shrink-0`}
                  >
                    <span className="text-xs font-bold text-white">
                      {agent.name[0]}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium">{agent.name}</span>
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${agent.status === "active" ? "bg-emerald-500 status-pulse" : "bg-amber-500"}`}
                      />
                    </div>
                    {agent.task ? (
                      <p className="text-[10px] font-mono text-muted-foreground truncate">
                        {agent.task}
                      </p>
                    ) : (
                      <p className="text-[10px] font-mono text-muted-foreground/40">
                        In development
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Priority Queue */}
          <section>
            <h3 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/60 mb-2 px-1">
              Priority Queue
            </h3>
            <div className="space-y-1.5">
              {priorityQueue.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border border-border bg-card border-l-2 ${urgencyBorder[item.urgency]}`}
                >
                  <item.icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {item.subtitle}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground/60 shrink-0 mt-0.5">
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Recent Activity */}
          <section>
            <h3 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/60 mb-2 px-1">
              Recent Activity
            </h3>
            <div className="space-y-0.5">
              {recentActivity.map((event, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-md hover:bg-accent/30 transition-colors"
                >
                  <event.icon
                    className={`h-3.5 w-3.5 shrink-0 ${event.color}`}
                  />
                  <span className="text-[13px] truncate flex-1">
                    {event.text}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground/50 shrink-0">
                    {event.time}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ====== RIGHT COLUMN ====== */}
        <div className="space-y-4">
          {/* Quick Actions — 2x2 grid */}
          <section>
            <h3 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/60 mb-2 px-1">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => onNavigate?.(action.route)}
                  className="flex flex-col items-center justify-center gap-1.5 px-3 py-4 rounded-lg border border-border bg-card hover:border-muted-foreground/30 hover:shadow-[0_0_12px_rgba(255,255,255,0.03)] transition-all"
                >
                  <action.icon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs font-medium">{action.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Stats — compact horizontal bar */}
          <section>
            <h3 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/60 mb-2 px-1">
              Stats
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Messages", value: "47", icon: MessageSquare },
                { label: "PRs Reviewed", value: "6", icon: GitPullRequest },
                { label: "Memory", value: "284", icon: Brain },
                { label: "Tokens", value: "232K", icon: Zap },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card"
                >
                  <stat.icon className="h-3.5 w-3.5 text-muted-foreground/50" />
                  <span className="text-lg font-mono font-semibold">
                    {stat.value}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Integration Status */}
          <section>
            <h3 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/60 mb-2 px-1">
              Integrations
            </h3>
            <div className="rounded-lg border border-border bg-card divide-y divide-border">
              {integrations.map((int) => (
                <div
                  key={int.name}
                  className="flex items-center gap-2.5 px-3 py-2"
                >
                  <int.icon className="h-3.5 w-3.5 text-muted-foreground/50" />
                  <span className="text-sm flex-1">{int.name}</span>
                  <span
                    className={`h-2 w-2 rounded-full ${integrationDotColor(int.status)}`}
                  />
                  <span className="text-[10px] font-mono text-muted-foreground/50 w-20 text-right">
                    {int.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
