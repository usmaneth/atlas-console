"use client";

import { useState, useEffect, useMemo } from "react";
import { useGateway, useActivity } from "@/lib/openclaw/hooks";
import { useSessions, useChannels } from "@/lib/openclaw/hooks";
import { Badge } from "@/components/ui/badge";
import {
  GitPullRequest,
  GitCommit,
  GitMerge,
  MessageSquare,
  Github,
  Zap,
  AlertTriangle,
  Bot,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ExternalLink,
  Circle,
  Lock,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// Parsed epic from master-task-breakdown.md
interface Epic {
  name: string;
  column: "active" | "blocked" | "upcoming";
  tasks: { title: string; done: boolean }[];
  totalTasks: number;
  doneTasks: number;
  owner?: string;
  status?: string;
}

// Activity feed item (human-readable)
interface ActivityItem {
  id: string;
  icon: "pr-open" | "commit" | "merge" | "ci-fail" | "ci-pass" | "alert";
  text: string;
  detail?: string;
  time: string;
  actionUrl?: string;
  actionRoute?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function DashboardClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="font-mono text-[11px] text-muted-foreground/50 tabular-nums">
      {time.toLocaleTimeString("en-US", { hour12: false })}
    </span>
  );
}

function formatUptime(ms: number | undefined): string {
  if (!ms) return "—";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ─── Garbage event filter ─────────────────────────────────────────────────────

const IGNORED_EVENTS = new Set([
  "presence", "tick", "health", "agent", "heartbeat",
  "connect.challenge", "ping", "pong", "status",
]);

// ─── Activity Feed Builder ────────────────────────────────────────────────────

function buildFeed(
  github: GitHubData | null,
  rawEvents: { id: string; type: string; title: string; description?: string; timestamp: Date; integration: string }[],
): ActivityItem[] {
  const items: ActivityItem[] = [];

  // GitHub PRs
  if (github?.prs) {
    for (const pr of github.prs) {
      if (pr.state === "open" && pr.ci?.failing) {
        items.push({
          id: `ci-fail-${pr.url}`,
          icon: "ci-fail",
          text: `${pr.ci.failing} CI check${pr.ci.failing > 1 ? "s" : ""} failing on "${pr.title}"`,
          detail: `${pr.repoName} · ${pr.ci.failedChecks.map((c) => c.name).join(", ")}`,
          time: pr.updatedAt || pr.createdAt,
          actionRoute: "/github",
        });
      } else if (pr.state === "open") {
        items.push({
          id: `pr-${pr.url}`,
          icon: pr.ci?.passing ? "ci-pass" : "pr-open",
          text: pr.ci?.passing
            ? `All ${pr.ci.passing} checks passing on "${pr.title}"`
            : `Open PR: "${pr.title}"`,
          detail: pr.repoName,
          time: pr.updatedAt || pr.createdAt,
          actionRoute: "/github",
        });
      } else if (pr.state === "merged") {
        items.push({
          id: `merged-${pr.url}`,
          icon: "merge",
          text: `Merged: "${pr.title}"`,
          detail: pr.repoName,
          time: pr.updatedAt || pr.createdAt,
        });
      }
    }
  }

  // GitHub commits
  if (github?.commits) {
    for (const c of github.commits.slice(0, 6)) {
      items.push({
        id: `commit-${c.sha}`,
        icon: "commit",
        text: `${c.author} pushed "${c.message}"`,
        detail: "atlas-console",
        time: c.date,
      });
    }
  }

  // Gateway events — ONLY meaningful ones
  for (const ev of rawEvents) {
    if (IGNORED_EVENTS.has(ev.title.toLowerCase())) continue;
    if (IGNORED_EVENTS.has(ev.type)) continue;
    if (ev.type === "alert") {
      items.push({ id: ev.id, icon: "alert", text: ev.title, detail: ev.description, time: ev.timestamp.toISOString() });
    }
    // Skip all other raw system events — they're noise
  }

  items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  return items;
}

// ─── Task Breakdown Parser ────────────────────────────────────────────────────

function parseEpics(md: string): Epic[] {
  const epics: Epic[] = [];
  const blocks = md.split(/^### /m).slice(1); // split by ### headers

  for (const block of blocks) {
    const lines = block.split("\n");
    const name = lines[0]?.trim().replace(/^Epic \d+:\s*/, "").replace(/\s*\(.*\)$/, "") || "Unknown";

    const tasks: { title: string; done: boolean }[] = [];
    let statusLine = "";
    let ownerLine = "";
    let dependsLine = "";

    for (const line of lines) {
      const trimmed = line.trim();
      const taskMatch = trimmed.match(/^[-*]\s*\[([x ]?)\]\s*\*\*(.+?)\*\*/);
      if (taskMatch) {
        tasks.push({ title: taskMatch[2].trim(), done: taskMatch[1] === "x" });
      }
      if (trimmed.startsWith("**Status:**")) statusLine = trimmed.toLowerCase();
      if (trimmed.startsWith("**Owner:**")) ownerLine = trimmed.replace("**Owner:**", "").trim();
      if (trimmed.startsWith("**Depends on:**")) dependsLine = trimmed.toLowerCase();
    }

    // Determine column
    let column: Epic["column"] = "upcoming";
    if (statusLine.includes("in progress") || statusLine.includes("shipped") || statusLine.includes("pr #")) {
      column = "active";
    }
    if (statusLine.includes("not started") && dependsLine.includes("nothing")) {
      column = "upcoming"; // can start but hasn't
    }
    if (
      (dependsLine.includes("blocked") || dependsLine.includes("stefan") || dependsLine.includes("rutwik")) &&
      !statusLine.includes("in progress")
    ) {
      column = "blocked";
    }
    if (statusLine.includes("not started") && statusLine.includes("phase 2")) column = "upcoming";
    if (statusLine.includes("not started") && statusLine.includes("phase 3")) column = "upcoming";

    const total = tasks.length;
    const done = tasks.filter((t) => t.done).length;

    epics.push({ name, column, tasks: tasks.filter((t) => !t.done), totalTasks: total, doneTasks: done, owner: ownerLine || undefined, status: statusLine });
  }

  return epics;
}

// ─── Icon Maps ────────────────────────────────────────────────────────────────

const feedIcon = {
  "pr-open": GitPullRequest,
  commit: GitCommit,
  merge: GitMerge,
  "ci-fail": XCircle,
  "ci-pass": CheckCircle2,
  alert: AlertTriangle,
};

const feedColor: Record<string, string> = {
  "pr-open": "text-emerald-400",
  commit: "text-blue-400",
  merge: "text-violet-400",
  "ci-fail": "text-red-400",
  "ci-pass": "text-emerald-400",
  alert: "text-red-400",
};

const colMeta: Record<string, { label: string; accent: string; dot: string }> = {
  active: { label: "Active", accent: "border-l-blue-500", dot: "bg-blue-500" },
  blocked: { label: "Blocked", accent: "border-l-red-500", dot: "bg-red-500" },
  upcoming: { label: "Up Next", accent: "border-l-amber-500", dot: "bg-amber-500" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage({ onNavigate }: DashboardProps) {
  const { status, gatewayInfo } = useGateway();
  const { events: rawEvents } = useActivity();
  const { sessions } = useSessions();
  const { channels } = useChannels();
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [github, setGithub] = useState<GitHubData | null>(null);
  const [githubLoading, setGithubLoading] = useState(true);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  useEffect(() => {
    fetch("/api/config").then((r) => r.json()).then(setConfig).catch(() => {});
    fetch("/api/github").then((r) => r.json()).then((d: GitHubData) => setGithub(d)).catch(() => {}).finally(() => setGithubLoading(false));
    fetch("/api/memory/master-task-breakdown.md")
      .then((r) => r.json())
      .then((d: { content?: string }) => { if (d.content) setEpics(parseEpics(d.content)); })
      .catch(() => {})
      .finally(() => setTasksLoading(false));
  }, []);

  const agents = useMemo(() => {
    const list = (config?.agents as Record<string, unknown>)?.list as Record<string, unknown>[] | undefined;
    return list ?? [];
  }, [config]);

  // Integration dots
  const dots = useMemo(() => {
    const d: { name: string; ok: boolean }[] = [];
    for (const ch of channels) {
      d.push({ name: ch.label || ch.channelType || ch.accountId, ok: !!(ch.running && ch.configured) });
    }
    if (github) d.push({ name: "GitHub", ok: github.authenticated });
    return d;
  }, [channels, github]);

  const feed = useMemo(() => buildFeed(github, rawEvents), [github, rawEvents]);

  // Categorize epics
  const epicsByCol = useMemo(() => {
    const cols: Record<string, Epic[]> = { active: [], blocked: [], upcoming: [] };
    for (const e of epics) cols[e.column]?.push(e);
    return cols;
  }, [epics]);

  // Open PR with CI failures (hero alert)
  const failingPR = github?.prs.find((p) => p.state === "open" && p.ci?.failing);

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      {/* ── Status Bar ── */}
      <div className="flex items-center gap-2.5 px-1 shrink-0">
        <span className={`h-2 w-2 rounded-full ${status === "connected" ? "bg-emerald-500" : status === "connecting" ? "bg-amber-500 animate-pulse" : "bg-red-500"}`} />
        <span className="text-[10px] font-mono text-muted-foreground/60">
          {formatUptime(gatewayInfo?.uptimeMs)} · {sessions.length} sessions · {agents.length} agents
        </span>
        <div className="flex items-center gap-2 ml-auto">
          {dots.map((d) => (
            <div key={d.name} className="flex items-center gap-1" title={d.name}>
              <span className={`h-1.5 w-1.5 rounded-full ${d.ok ? "bg-emerald-500" : "bg-red-500"}`} />
              <span className="text-[9px] font-mono text-muted-foreground/40">{d.name}</span>
            </div>
          ))}
          <DashboardClock />
        </div>
      </div>

      {/* ── CI Alert Banner ── */}
      {failingPR && (
        <button
          onClick={() => onNavigate?.("/github")}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 transition-colors shrink-0"
        >
          <XCircle className="h-4 w-4 text-red-400 shrink-0" />
          <div className="flex-1 text-left min-w-0">
            <span className="text-[13px] font-medium text-red-300">
              {failingPR.ci?.failing} CI check{(failingPR.ci?.failing ?? 0) > 1 ? "s" : ""} failing
            </span>
            <span className="text-[12px] text-red-400/60 ml-2 truncate">{failingPR.title}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Bot className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-[11px] text-violet-400 font-medium">Fix with agent</span>
            <ArrowRight className="h-3 w-3 text-violet-400/60" />
          </div>
        </button>
      )}

      {/* ── Main Content: 2 columns ── */}
      <div className="flex-1 grid grid-cols-[1fr_380px] gap-4 min-h-0 overflow-hidden">
        {/* LEFT: Activity Feed */}
        <div className="flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between mb-2 px-1 shrink-0">
            <h2 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/50">Activity</h2>
            <button onClick={() => onNavigate?.("/activity")} className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground/60 flex items-center gap-0.5">
              All <ArrowRight className="h-2.5 w-2.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto rounded-lg border border-border/50 bg-card/30">
            {githubLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground/40 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : feed.length > 0 ? (
              <div className="divide-y divide-border/30">
                {feed.map((item) => {
                  const Icon = feedIcon[item.icon];
                  const color = feedColor[item.icon];
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.actionUrl) window.open(item.actionUrl, "_blank");
                        else if (item.actionRoute) onNavigate?.(item.actionRoute);
                      }}
                      className={`w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors ${item.actionRoute || item.actionUrl ? "hover:bg-accent/20 cursor-pointer" : ""}`}
                    >
                      <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] leading-snug">{item.text}</p>
                        {item.detail && <p className="text-[10px] text-muted-foreground/40 mt-0.5 truncate">{item.detail}</p>}
                      </div>
                      <span className="text-[9px] font-mono text-muted-foreground/30 shrink-0 mt-0.5">{timeAgo(item.time)}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12 text-muted-foreground/30 text-sm">
                {status === "connected" ? "No activity yet" : "Connecting..."}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Task Board + GitHub Preview */}
        <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
          {/* Task Board */}
          <div>
            <h2 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/50 mb-2 px-1">Tasks</h2>
            {tasksLoading ? (
              <div className="flex items-center gap-2 py-6 text-muted-foreground/40 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
            ) : epics.length > 0 ? (
              <div className="space-y-3">
                {(["active", "blocked", "upcoming"] as const).map((col) => {
                  const items = epicsByCol[col];
                  if (!items || items.length === 0) return null;
                  const meta = colMeta[col];
                  return (
                    <div key={col}>
                      <div className="flex items-center gap-1.5 mb-1.5 px-1">
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/40">{meta.label}</span>
                        <Badge variant="secondary" className="text-[8px] px-1 py-0 font-mono ml-auto">{items.length}</Badge>
                      </div>
                      <div className="space-y-1.5">
                        {items.map((epic, i) => (
                          <div key={i} className={`rounded-md border border-border/40 bg-card/40 border-l-2 ${meta.accent} px-3 py-2`}>
                            <div className="flex items-center justify-between">
                              <p className="text-[12px] font-medium leading-tight">{epic.name}</p>
                              <span className="text-[9px] font-mono text-muted-foreground/40">{epic.doneTasks}/{epic.totalTasks}</span>
                            </div>
                            {/* Progress bar */}
                            <div className="mt-1.5 h-1 rounded-full bg-border/30 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${col === "active" ? "bg-blue-500" : col === "blocked" ? "bg-red-500" : "bg-amber-500"}`}
                                style={{ width: `${epic.totalTasks > 0 ? (epic.doneTasks / epic.totalTasks) * 100 : 0}%` }}
                              />
                            </div>
                            {epic.tasks.length > 0 && (
                              <div className="mt-2 space-y-0.5">
                                {epic.tasks.slice(0, 3).map((t, j) => (
                                  <div key={j} className="flex items-center gap-1.5">
                                    <Circle className="h-2 w-2 shrink-0 text-muted-foreground/20" />
                                    <span className="text-[10px] text-muted-foreground/60 truncate">{t.title}</span>
                                  </div>
                                ))}
                                {epic.tasks.length > 3 && (
                                  <span className="text-[9px] text-muted-foreground/30 pl-3.5">+{epic.tasks.length - 3} more</span>
                                )}
                              </div>
                            )}
                            {epic.owner && (
                              <p className="text-[9px] text-muted-foreground/30 mt-1.5">{epic.owner}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-md border border-border/30 bg-card/30 px-3 py-4 text-[11px] text-muted-foreground/30 text-center">
                No task breakdown found
              </div>
            )}
          </div>

          {/* GitHub Quick View */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-1.5">
                <Github className="h-3 w-3 text-muted-foreground/40" />
                <h2 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/50">GitHub</h2>
              </div>
              <button onClick={() => onNavigate?.("/github")} className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground/60 flex items-center gap-0.5">
                Full view <ArrowRight className="h-2.5 w-2.5" />
              </button>
            </div>
            {githubLoading ? (
              <div className="flex items-center gap-2 py-4 text-muted-foreground/40 text-sm"><Loader2 className="h-4 w-4 animate-spin" /></div>
            ) : github?.authenticated ? (
              <div className="space-y-1">
                {github.prs.slice(0, 4).map((pr, i) => (
                  <a
                    key={i}
                    href={pr.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-accent/20 transition-colors group"
                  >
                    {pr.state === "merged" ? (
                      <GitMerge className="h-3 w-3 shrink-0 text-violet-400/60" />
                    ) : (
                      <GitPullRequest className="h-3 w-3 shrink-0 text-emerald-400/60" />
                    )}
                    <span className="text-[11px] truncate flex-1">{pr.title}</span>
                    {pr.ci?.failing ? (
                      <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-red-500/15 text-red-400 border-red-500/20">✗ {pr.ci.failing}</Badge>
                    ) : pr.ci?.passing ? (
                      <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-emerald-500/15 text-emerald-400 border-emerald-500/20">✓</Badge>
                    ) : null}
                    <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-0 group-hover:opacity-40" />
                  </a>
                ))}
                {github.commits.length > 0 && (
                  <div className="pt-1 mt-1 border-t border-border/20">
                    {github.commits.slice(0, 3).map((c, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1">
                        <GitCommit className="h-2.5 w-2.5 shrink-0 text-muted-foreground/30" />
                        <code className="text-[9px] font-mono text-violet-400/50">{c.sha}</code>
                        <span className="text-[10px] text-muted-foreground/50 truncate flex-1">{c.message}</span>
                        <span className="text-[8px] font-mono text-muted-foreground/20">{timeAgo(c.date)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="px-3 py-3 text-[11px] text-muted-foreground/30">
                <code>gh auth login</code> to connect
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
