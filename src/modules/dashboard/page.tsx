"use client";

import { useState, useEffect, useMemo } from "react";
import { useGateway, useActivity } from "@/lib/openclaw/hooks";
import { useSessions, useChannels } from "@/lib/openclaw/hooks";
import { Badge } from "@/components/ui/badge";
import {
  GitPullRequest,
  GitCommit,
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
  ExternalLink,
  Lock,
  Globe,
} from "lucide-react";

interface DashboardProps {
  onNavigate?: (route: string) => void;
}

interface GitHubPR {
  title: string;
  state: string;
  url: string;
  repo: string;
  repoName: string;
  createdAt: string;
  updatedAt?: string;
}

interface GitHubCommit {
  sha: string;
  message: string;
  date: string;
  url: string;
  author: string;
}

interface GitHubRepo {
  name: string;
  pushedAt: string;
  defaultBranch: string;
  description: string | null;
  isPrivate: boolean;
  url: string | null;
}

interface GitHubData {
  user: string;
  authenticated: boolean;
  prs: GitHubPR[];
  repos: GitHubRepo[];
  commits: GitHubCommit[];
  fetchedAt: string;
  error?: string;
}

function prStateBadge(state: string) {
  if (state === "open") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
  if (state === "merged") return "bg-violet-500/15 text-violet-400 border-violet-500/20";
  if (state === "closed") return "bg-red-500/15 text-red-400 border-red-500/20";
  return "bg-muted text-muted-foreground";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
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

function formatUptime(ms: number | undefined): string {
  if (!ms) return "—";
  const totalSeconds = Math.floor(ms / 1000);
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

export default function DashboardPage({ onNavigate }: DashboardProps) {
  const { status, gatewayInfo } = useGateway();
  const { events: activityEvents } = useActivity();
  const { sessions } = useSessions();
  const { channels } = useChannels();
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [github, setGithub] = useState<GitHubData | null>(null);
  const [githubLoading, setGithubLoading] = useState(true);

  useEffect(() => {
    fetch("/api/config").then((r) => r.json()).then(setConfig).catch(() => {});
    fetch("/api/github")
      .then((r) => r.json())
      .then((d: GitHubData) => setGithub(d))
      .catch(() => {})
      .finally(() => setGithubLoading(false));
  }, []);

  const agents = useMemo(() => {
    const list = (config?.agents as Record<string, unknown>)?.list as Record<string, unknown>[] | undefined;
    return list ?? [];
  }, [config]);

  const recentActivity = activityEvents.slice(0, 8);

  const channelList = useMemo(() => {
    if (channels.length > 0) {
      return channels.map((ch) => {
        let derivedStatus = "disconnected";
        if (ch.running && ch.configured) derivedStatus = "connected";
        else if (ch.configured && !ch.running && ch.lastError) derivedStatus = "error";
        else if (!ch.configured) derivedStatus = "not configured";
        return {
          name: ch.label || ch.channelType || ch.accountId,
          status: derivedStatus,
          icon: integrationIcons[ch.channelType?.toLowerCase()] || MessageSquare,
          detail: ch.lastError || undefined,
          channelType: ch.channelType,
        };
      });
    }
    // Fallback: derive from config channels
    if (config?.channels) {
      return Object.entries(config.channels as Record<string, Record<string, unknown>>).map(([key, ch]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        status: ch.enabled ? "connected" : "disconnected",
        icon: integrationIcons[key.toLowerCase()] || MessageSquare,
        detail: undefined as string | undefined,
        channelType: key,
      }));
    }
    return [] as { name: string; status: string; icon: typeof Github; detail?: string; channelType?: string }[];
  }, [channels, config]);

  // Add GitHub to integrations list
  const allIntegrations = useMemo(() => {
    const list = [...channelList];
    if (github) {
      list.push({
        name: "GitHub",
        status: github.authenticated ? "connected" : "error",
        icon: Github,
        detail: github.authenticated ? `@${github.user}` : (github.error || "not authenticated"),
        channelType: "github",
      });
    } else if (githubLoading) {
      list.push({
        name: "GitHub",
        status: "connecting",
        icon: Github,
        detail: undefined,
        channelType: "github",
      });
    }
    return list;
  }, [channelList, github, githubLoading]);

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
          Uptime: {formatUptime(gatewayInfo?.uptimeMs)}
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
          {/* GitHub Activity */}
          <section>
            <h3 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/60 mb-2 px-1">
              GitHub
            </h3>
            {githubLoading ? (
              <div className="flex items-center gap-2 px-3 py-4 text-muted-foreground/50 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading GitHub data...
              </div>
            ) : github?.authenticated ? (
              <div className="space-y-3">
                {/* Recent PRs */}
                {github.prs.length > 0 && (
                  <div className="rounded-lg border border-border bg-card">
                    <div className="px-3 py-1.5 border-b border-border">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/50">
                        Pull Requests
                      </span>
                    </div>
                    <div className="divide-y divide-border">
                      {github.prs.slice(0, 5).map((pr, i) => (
                        <a
                          key={i}
                          href={pr.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-2.5 px-3 py-2 hover:bg-accent/30 transition-colors group"
                        >
                          <GitPullRequest className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/50" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[13px] truncate">{pr.title}</span>
                              <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-50 transition-opacity" />
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-mono text-muted-foreground/50">{pr.repoName}</span>
                              <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 ${prStateBadge(pr.state)}`}>
                                {pr.state}
                              </Badge>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground/40 shrink-0 mt-0.5">
                            {timeAgo(pr.updatedAt || pr.createdAt)}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Commits */}
                {github.commits.length > 0 && (
                  <div className="rounded-lg border border-border bg-card">
                    <div className="px-3 py-1.5 border-b border-border">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/50">
                        Recent Commits (atlas-console)
                      </span>
                    </div>
                    <div className="divide-y divide-border">
                      {github.commits.slice(0, 5).map((c, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2.5 px-3 py-1.5"
                        >
                          <GitCommit className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                          <code className="text-[10px] font-mono text-violet-400/70">{c.sha}</code>
                          <span className="text-[12px] truncate flex-1">{c.message}</span>
                          <span className="text-[10px] font-mono text-muted-foreground/40 shrink-0">
                            {timeAgo(c.date)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Repos */}
                {github.repos.length > 0 && (
                  <div className="rounded-lg border border-border bg-card">
                    <div className="px-3 py-1.5 border-b border-border">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/50">
                        Repos
                      </span>
                    </div>
                    <div className="divide-y divide-border">
                      {github.repos.slice(0, 5).map((r, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2.5 px-3 py-1.5"
                        >
                          {r.isPrivate ? (
                            <Lock className="h-3 w-3 shrink-0 text-amber-400/50" />
                          ) : (
                            <Globe className="h-3 w-3 shrink-0 text-muted-foreground/40" />
                          )}
                          <span className="text-[13px] font-mono">{r.name}</span>
                          <span className="text-[10px] text-muted-foreground/40 truncate flex-1">{r.description || ""}</span>
                          <span className="text-[10px] font-mono text-muted-foreground/40 shrink-0">
                            {timeAgo(r.pushedAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="px-3 py-3 rounded-lg border border-border bg-card text-sm text-muted-foreground/50">
                GitHub CLI not authenticated. Run <code className="text-xs bg-secondary px-1 py-0.5 rounded">gh auth login</code> to connect.
              </div>
            )}
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
                { label: "Integrations", value: String(allIntegrations.length), icon: Zap },
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
              {allIntegrations.length > 0 ? (
                allIntegrations.map((int) => (
                  <div key={int.name} className="flex items-center gap-2.5 px-3 py-2">
                    <int.icon className="h-3.5 w-3.5 text-muted-foreground/50" />
                    <span className="text-sm flex-1">{int.name}</span>
                    {int.detail && (
                      <span className="text-[10px] font-mono text-muted-foreground/40 truncate max-w-24">
                        {int.detail}
                      </span>
                    )}
                    <span className={`h-2 w-2 rounded-full ${integrationDotColor(int.status as string)}`} />
                    <span className="text-[10px] font-mono text-muted-foreground/50 w-24 text-right">
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
