"use client";

import { useState, useEffect, useMemo } from "react";
import { useGateway, useActivity } from "@/lib/openclaw/hooks";
import { useSessions, useChannels } from "@/lib/openclaw/hooks";
import { Badge } from "@/components/ui/badge";
import {
  GitPullRequest,
  GitCommit,
  GitMerge,
  Brain,
  MessageSquare,
  Github,
  FileText,
  Zap,
  AlertTriangle,
  Bot,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Columns3,
} from "lucide-react";

interface DashboardProps {
  onNavigate?: (route: string) => void;
}

interface GitHubCI {
  passing: number;
  failing: number;
  pending: number;
  failedChecks: { name: string; url: string; duration: string }[];
}

interface GitHubPR {
  title: string;
  state: string;
  url: string;
  repo: string;
  repoName: string;
  createdAt: string;
  updatedAt?: string;
  ci?: GitHubCI;
}

interface GitHubCommit {
  sha: string;
  message: string;
  date: string;
  url: string;
  author: string;
}

interface GitHubData {
  user: string;
  authenticated: boolean;
  prs: GitHubPR[];
  repos: { name: string; pushedAt: string; defaultBranch: string; description: string | null; isPrivate: boolean; url: string | null }[];
  commits: GitHubCommit[];
  fetchedAt: string;
  error?: string;
}

interface TaskItem {
  title: string;
  status: "in-progress" | "blocked" | "next" | "done" | "backlog";
  agent?: string;
}

interface TaskColumn {
  label: string;
  status: string;
  color: string;
  items: TaskItem[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

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
  if (!ms) return "--";
  const totalSeconds = Math.floor(ms / 1000);
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

// --- Activity Feed: transform raw data into human-readable items ---

interface ActivityItem {
  id: string;
  icon: "pr" | "commit" | "merge" | "ci-fail" | "ci-pass" | "agent" | "system" | "alert";
  text: string;
  detail?: string;
  time: string;
  actionRoute?: string;
}

function buildActivityFeed(
  github: GitHubData | null,
  gatewayEvents: { id: string; type: string; title: string; description?: string; timestamp: Date; integration: string }[],
): ActivityItem[] {
  const items: ActivityItem[] = [];

  // GitHub PRs as activity
  if (github?.prs) {
    for (const pr of github.prs) {
      if (pr.state === "open") {
        if (pr.ci?.failing && pr.ci.failing > 0) {
          items.push({
            id: `pr-ci-${pr.url}`,
            icon: "ci-fail",
            text: `${pr.ci.failing} CI check${pr.ci.failing > 1 ? "s" : ""} failing on "${pr.title}"`,
            detail: `${pr.repoName} -- ${pr.ci.failedChecks.map((c) => c.name).join(", ")}`,
            time: pr.updatedAt || pr.createdAt,
            actionRoute: "/github",
          });
        } else if (pr.ci?.passing && pr.ci.passing > 0) {
          items.push({
            id: `pr-pass-${pr.url}`,
            icon: "ci-pass",
            text: `All ${pr.ci.passing} checks passing on "${pr.title}"`,
            detail: pr.repoName,
            time: pr.updatedAt || pr.createdAt,
            actionRoute: "/github",
          });
        } else {
          items.push({
            id: `pr-open-${pr.url}`,
            icon: "pr",
            text: `Open PR: "${pr.title}"`,
            detail: pr.repoName,
            time: pr.updatedAt || pr.createdAt,
            actionRoute: "/github",
          });
        }
      } else if (pr.state === "merged") {
        items.push({
          id: `pr-merged-${pr.url}`,
          icon: "merge",
          text: `Merged: "${pr.title}"`,
          detail: pr.repoName,
          time: pr.updatedAt || pr.createdAt,
        });
      }
    }
  }

  // GitHub commits as activity
  if (github?.commits) {
    for (const c of github.commits.slice(0, 5)) {
      items.push({
        id: `commit-${c.sha}`,
        icon: "commit",
        text: `${c.author} pushed "${c.message}"`,
        detail: "atlas-console",
        time: c.date,
      });
    }
  }

  // Gateway events transformed into readable items
  for (const event of gatewayEvents.slice(0, 10)) {
    if (event.type === "alert") {
      items.push({
        id: event.id,
        icon: "alert",
        text: event.title,
        detail: event.description,
        time: event.timestamp.toISOString(),
      });
    } else if (event.integration !== "system" || event.title !== "health") {
      items.push({
        id: event.id,
        icon: event.integration === "github" ? "commit" : "system",
        text: event.title,
        detail: event.description,
        time: event.timestamp.toISOString(),
      });
    }
  }

  // Sort by time descending
  items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  return items;
}

const activityIconMap = {
  pr: GitPullRequest,
  commit: GitCommit,
  merge: GitMerge,
  "ci-fail": XCircle,
  "ci-pass": CheckCircle2,
  agent: Bot,
  system: Zap,
  alert: AlertTriangle,
};

const activityColorMap: Record<string, string> = {
  pr: "text-emerald-400",
  commit: "text-blue-400",
  merge: "text-violet-400",
  "ci-fail": "text-red-400",
  "ci-pass": "text-emerald-400",
  agent: "text-amber-400",
  system: "text-muted-foreground",
  alert: "text-red-400",
};

// --- Task Board: parse master-task-breakdown.md ---

function parseTaskBreakdown(content: string): TaskColumn[] {
  const columns: TaskColumn[] = [
    { label: "In Progress", status: "in-progress", color: "border-blue-500/50", items: [] },
    { label: "Blocked", status: "blocked", color: "border-red-500/50", items: [] },
    { label: "Up Next", status: "next", color: "border-amber-500/50", items: [] },
  ];

  const lines = content.split("\n");
  let currentStatus: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect section headers
    const lower = trimmed.toLowerCase();
    if (lower.includes("in progress") || lower.includes("in-progress") || lower.includes("active")) {
      currentStatus = "in-progress";
      continue;
    }
    if (lower.includes("blocked") || lower.includes("waiting")) {
      currentStatus = "blocked";
      continue;
    }
    if (lower.includes("up next") || lower.includes("backlog") || lower.includes("todo") || lower.includes("planned")) {
      currentStatus = "next";
      continue;
    }
    if (lower.includes("done") || lower.includes("completed") || lower.includes("shipped")) {
      currentStatus = "done";
      continue;
    }

    // Parse task items (- [ ] or - [x] or just - items)
    const taskMatch = trimmed.match(/^[-*]\s*(?:\[([x ]?)\])?\s*(.+)/i);
    if (taskMatch && currentStatus && currentStatus !== "done") {
      const checked = taskMatch[1] === "x";
      let title = taskMatch[2].trim();
      let agent: string | undefined;

      // Extract agent assignment like (@atlas-zeta-dev) or [atlas-platform-eng]
      const agentMatch = title.match(/[\[@]([a-z-]+(?:-[a-z]+)*)[)\]]/i);
      if (agentMatch) {
        agent = agentMatch[1];
        title = title.replace(/\s*[\[@][a-z-]+(?:-[a-z]+)*[)\]]/i, "").trim();
      }

      if (!checked) {
        const col = columns.find((c) => c.status === currentStatus);
        if (col) {
          col.items.push({ title, status: currentStatus as TaskItem["status"], agent });
        }
      }
    }
  }

  return columns.filter((c) => c.items.length > 0);
}

export default function DashboardPage({ onNavigate }: DashboardProps) {
  const { status, gatewayInfo } = useGateway();
  const { events: activityEvents } = useActivity();
  const { sessions } = useSessions();
  const { channels } = useChannels();
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [github, setGithub] = useState<GitHubData | null>(null);
  const [githubLoading, setGithubLoading] = useState(true);
  const [taskColumns, setTaskColumns] = useState<TaskColumn[]>([]);
  const [taskLoading, setTaskLoading] = useState(true);

  useEffect(() => {
    fetch("/api/config").then((r) => r.json()).then(setConfig).catch(() => {});
    fetch("/api/github")
      .then((r) => r.json())
      .then((d: GitHubData) => setGithub(d))
      .catch(() => {})
      .finally(() => setGithubLoading(false));
    fetch("/api/memory/master-task-breakdown.md")
      .then((r) => r.json())
      .then((d: { content?: string }) => {
        if (d.content) {
          setTaskColumns(parseTaskBreakdown(d.content));
        }
      })
      .catch(() => {})
      .finally(() => setTaskLoading(false));
  }, []);

  const agents = useMemo(() => {
    const list = (config?.agents as Record<string, unknown>)?.list as Record<string, unknown>[] | undefined;
    return list ?? [];
  }, [config]);

  // Build integration status inline
  const integrationDots = useMemo(() => {
    const dots: { name: string; status: string }[] = [];

    // From channels
    if (channels.length > 0) {
      for (const ch of channels) {
        let s = "disconnected";
        if (ch.running && ch.configured) s = "connected";
        else if (ch.configured && !ch.running && ch.lastError) s = "error";
        dots.push({ name: ch.label || ch.channelType || ch.accountId, status: s });
      }
    } else if (config?.channels) {
      for (const [key, ch] of Object.entries(config.channels as Record<string, Record<string, unknown>>)) {
        dots.push({ name: key, status: ch.enabled ? "connected" : "disconnected" });
      }
    }

    // GitHub
    if (github) {
      dots.push({ name: "GitHub", status: github.authenticated ? "connected" : "error" });
    }

    return dots;
  }, [channels, config, github]);

  // Build activity feed
  const activityFeed = useMemo(
    () => buildActivityFeed(github, activityEvents),
    [github, activityEvents],
  );

  return (
    <div className="space-y-6">
      {/* Compact Status Bar */}
      <div className="flex items-center gap-3 px-1">
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${status === "connected" ? "bg-emerald-500" : status === "connecting" ? "bg-yellow-500 animate-pulse" : "bg-red-500"}`}
          />
          <span className="text-[11px] font-mono text-muted-foreground">Gateway</span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground/40">|</span>
        <span className="text-[10px] font-mono text-muted-foreground/50">
          {formatUptime(gatewayInfo?.uptimeMs)} uptime
        </span>
        <span className="text-[10px] font-mono text-muted-foreground/40">|</span>
        <span className="text-[10px] font-mono text-muted-foreground/50">
          {sessions.length} session{sessions.length !== 1 ? "s" : ""}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground/40">|</span>
        <span className="text-[10px] font-mono text-muted-foreground/50">
          {agents.length} agent{agents.length !== 1 ? "s" : ""}
        </span>

        {/* Integration dots inline */}
        <div className="flex items-center gap-2 ml-auto">
          {integrationDots.map((d) => (
            <div key={d.name} className="flex items-center gap-1" title={`${d.name}: ${d.status}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${integrationDotColor(d.status)}`} />
              <span className="text-[9px] font-mono text-muted-foreground/40">{d.name}</span>
            </div>
          ))}
          <span className="text-[10px] font-mono text-muted-foreground/40">|</span>
          <DashboardClock />
        </div>
      </div>

      {/* Intelligent Activity Feed — HERO */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-foreground">Activity</h2>
          <button
            onClick={() => onNavigate?.("/activity")}
            className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors flex items-center gap-1"
          >
            View all <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <div className="rounded-xl border border-border bg-card/50">
          {githubLoading ? (
            <div className="flex items-center gap-2 px-4 py-8 justify-center text-muted-foreground/50 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Building activity feed...
            </div>
          ) : activityFeed.length > 0 ? (
            <div className="divide-y divide-border/50">
              {activityFeed.slice(0, 12).map((item) => {
                const Icon = activityIconMap[item.icon];
                const color = activityColorMap[item.icon];
                return (
                  <button
                    key={item.id}
                    onClick={() => item.actionRoute && onNavigate?.(item.actionRoute)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${item.actionRoute ? "hover:bg-accent/30 cursor-pointer" : "cursor-default"}`}
                  >
                    <div className={`mt-0.5 shrink-0 ${color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] leading-snug">{item.text}</p>
                      {item.detail && (
                        <p className="text-[11px] text-muted-foreground/50 mt-0.5 truncate">{item.detail}</p>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground/40 shrink-0 mt-0.5">
                      {timeAgo(item.time)}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground/40">
              {status === "connected"
                ? "No activity yet. Events from GitHub, agents, and integrations will appear here."
                : "Connect to gateway to see activity."}
            </div>
          )}
        </div>
      </section>

      {/* Task Board Preview */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Columns3 className="h-4 w-4 text-muted-foreground/50" />
            <h2 className="text-sm font-medium text-foreground">Task Board</h2>
          </div>
        </div>

        {taskLoading ? (
          <div className="flex items-center gap-2 px-4 py-6 text-muted-foreground/50 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading tasks...
          </div>
        ) : taskColumns.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {taskColumns.map((col) => (
              <div key={col.status} className={`rounded-lg border ${col.color} bg-card/30 p-3`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/60">
                    {col.label}
                  </h3>
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-mono">
                    {col.items.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {col.items.slice(0, 5).map((task, i) => (
                    <div
                      key={i}
                      className="px-3 py-2 rounded-md bg-background/50 border border-border/50"
                    >
                      <p className="text-[12px] leading-snug">{task.title}</p>
                      {task.agent && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <Bot className="h-3 w-3 text-violet-400/60" />
                          <span className="text-[10px] font-mono text-violet-400/60">{task.agent}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {col.items.length > 5 && (
                    <p className="text-[10px] text-muted-foreground/40 text-center py-1">
                      +{col.items.length - 5} more
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card/30 px-4 py-6 text-center text-sm text-muted-foreground/40">
            No task breakdown found. Add a master-task-breakdown.md to your workspace memory.
          </div>
        )}
      </section>
    </div>
  );
}
