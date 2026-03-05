"use client";

import { useState, useEffect, useMemo } from "react";
import { useGateway, useActivity } from "@/lib/openclaw/hooks";
import { useSessions, useChannels } from "@/lib/openclaw/hooks";
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
  Loader2,
} from "lucide-react";

interface DashboardProps {
  onNavigate?: (route: string) => void;
}

const quickActions = [
  { label: "Ask Atlas", icon: Bot, route: "/chat" },
  { label: "Review PRs", icon: GitPullRequest, route: "/activity" },
  { label: "Check Slack", icon: MessageSquare, route: "/activity" },
  { label: "Meeting Prep", icon: Calendar, route: "/chat" },
];

const integrationIcons: Record<string, typeof Github> = {
  github: Github,
  discord: MessageSquare,
  slack: MessageSquare,
  notion: FileText,
  google: Mail,
};

function integrationDotColor(status: string): string {
  if (status === "connected") return "bg-emerald-500";
  if (status === "degraded" || status === "error") return "bg-amber-500";
  return "bg-red-500";
}

function DashboardClock() {
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

function formatUptime(seconds: number | undefined): string {
  if (!seconds) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

export default function DashboardPage({ onNavigate }: DashboardProps) {
  const { status, gatewayInfo } = useGateway();
  const { events: activityEvents } = useActivity();
  const { sessions } = useSessions();
  const { channels } = useChannels();
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("/api/config").then((r) => r.json()).then(setConfig).catch(() => {});
  }, []);

  const agents = useMemo(() => {
    const list = (config?.agents as Record<string, unknown>)?.list as Record<string, unknown>[] | undefined;
    return list ?? [];
  }, [config]);

  const recentActivity = activityEvents.slice(0, 8);

  const channelList = useMemo(() => {
    if (channels.length > 0) {
      return channels.map((ch) => ({
        name: ch.name,
        status: ch.status,
        icon: integrationIcons[ch.type?.toLowerCase()] || MessageSquare,
      }));
    }
    // Fallback: derive from config channels
    if (config?.channels) {
      return Object.entries(config.channels as Record<string, Record<string, unknown>>).map(([key, ch]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        status: ch.enabled ? "connected" : "disconnected",
        icon: integrationIcons[key.toLowerCase()] || MessageSquare,
      }));
    }
    return [];
  }, [channels, config]);

  return (
    <div className="space-y-4">
      {/* Top Status Strip */}
      <div className="flex items-center gap-4 px-1 py-1">
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${status === "connected" ? "bg-emerald-500" : status === "connecting" ? "bg-yellow-500 animate-pulse" : "bg-red-500"}`}
          />
          <span className="text-[11px] font-mono text-muted-foreground">Gateway</span>
        </div>
        <Badge variant="secondary" className="font-mono text-[10px] px-2 py-0">
          Sessions: {sessions.length}
        </Badge>
        <DashboardClock />
        <span className="text-[10px] font-mono text-muted-foreground/50">
          Uptime: {formatUptime(gatewayInfo?.uptime)}
        </span>
      </div>

      {/* Main Grid: 60/40 */}
      <div className="grid grid-cols-[1fr_0.67fr] gap-4">
        {/* LEFT COLUMN */}
        <div className="space-y-4">
          {/* Active Agents */}
          <section>
            <h3 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/60 mb-2 px-1">
              Agents ({agents.length})
            </h3>
            <div className="flex gap-2">
              {agents.length > 0 ? (
                agents.slice(0, 4).map((agent) => {
                  const name = (agent.name as string) || (agent.id as string) || "Unknown";
                  const colors = ["bg-emerald-500", "bg-violet-500", "bg-amber-500", "bg-blue-500"];
                  const colorIdx = name.charCodeAt(0) % colors.length;
                  return (
                    <button
                      key={agent.id as string}
                      onClick={() => onNavigate?.("/agents")}
                      className="flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border bg-card hover:border-muted-foreground/30 transition-colors text-left"
                    >
                      <div className={`h-7 w-7 rounded-lg ${colors[colorIdx]} flex items-center justify-center shrink-0`}>
                        <span className="text-xs font-bold text-white">{name[0]?.toUpperCase()}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium">{name}</span>
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 status-pulse" />
                        </div>
                        <p className="text-[10px] font-mono text-muted-foreground truncate">
                          {(agent.model as string)?.split("/").pop() || "—"}
                        </p>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="flex items-center gap-2 px-3 py-2.5 text-muted-foreground/50 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading agents...
                </div>
              )}
            </div>
          </section>

          {/* Priority Queue / Alerts */}
          {activityEvents.filter((e) => e.type === "alert").length > 0 && (
            <section>
              <h3 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/60 mb-2 px-1">
                Alerts
              </h3>
              <div className="space-y-1.5">
                {activityEvents
                  .filter((e) => e.type === "alert")
                  .slice(0, 4)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-border bg-card border-l-2 border-l-red-500"
                    >
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{item.title}</p>
                        {item.description && (
                          <p className="text-[11px] text-muted-foreground truncate">{item.description}</p>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground/60 shrink-0 mt-0.5">
                        {item.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* Recent Activity */}
          <section>
            <h3 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/60 mb-2 px-1">
              Recent Activity
            </h3>
            <div className="space-y-0.5">
              {recentActivity.length > 0 ? (
                recentActivity.map((event) => {
                  const iconMap: Record<string, typeof Github> = {
                    github: Github,
                    slack: MessageSquare,
                    discord: MessageSquare,
                    notion: FileText,
                    system: Brain,
                  };
                  const Icon = iconMap[event.integration] || Zap;
                  const colorMap: Record<string, string> = {
                    github: "text-github",
                    slack: "text-slack",
                    discord: "text-indigo-400",
                    notion: "text-notion",
                    system: "text-emerald-400",
                  };
                  return (
                    <div
                      key={event.id}
                      className="flex items-center gap-2.5 px-3 py-1.5 rounded-md hover:bg-accent/30 transition-colors"
                    >
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${colorMap[event.integration] || "text-muted-foreground"}`} />
                      <span className="text-[13px] truncate flex-1">{event.title}</span>
                      <span className="text-[10px] font-mono text-muted-foreground/50 shrink-0">
                        {event.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="px-3 py-4 text-sm text-muted-foreground/50">
                  {status === "connected" ? "No activity yet — events will appear as they happen." : "Connect to gateway to see activity."}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">
          {/* Quick Actions */}
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

          {/* Stats */}
          <section>
            <h3 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/60 mb-2 px-1">
              Stats
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Messages", value: String(activityEvents.filter((e) => e.integration !== "system").length), icon: MessageSquare },
                { label: "Sessions", value: String(sessions.length), icon: GitPullRequest },
                { label: "Agents", value: String(agents.length), icon: Brain },
                { label: "Channels", value: String(channelList.length), icon: Zap },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card">
                  <stat.icon className="h-3.5 w-3.5 text-muted-foreground/50" />
                  <span className="text-lg font-mono font-semibold">{stat.value}</span>
                  <span className="text-[10px] text-muted-foreground/60">{stat.label}</span>
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
              {channelList.length > 0 ? (
                channelList.map((int) => (
                  <div key={int.name} className="flex items-center gap-2.5 px-3 py-2">
                    <int.icon className="h-3.5 w-3.5 text-muted-foreground/50" />
                    <span className="text-sm flex-1">{int.name}</span>
                    <span className={`h-2 w-2 rounded-full ${integrationDotColor(int.status as string)}`} />
                    <span className="text-[10px] font-mono text-muted-foreground/50 w-20 text-right">
                      {int.status as string}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-3 py-3 text-sm text-muted-foreground/50">
                  {status === "connected" ? "No integrations configured" : "Connecting..."}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
