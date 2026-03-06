"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useGateway, useActivity } from "@/lib/openclaw/hooks";
import { useSessions, useChannels } from "@/lib/openclaw/hooks";
import { Badge } from "@/components/ui/badge";
import { TypewriterText } from "@/components/typewriter-text";
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
  Brain,
  Sparkles,
  Play,
  ChevronDown,
  ChevronUp,
  Send,
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

interface Epic {
  name: string;
  column: "active" | "blocked" | "upcoming";
  tasks: { title: string; done: boolean }[];
  totalTasks: number;
  doneTasks: number;
  owner?: string;
  status?: string;
}

interface ActivityItem {
  id: string;
  icon: "pr-open" | "commit" | "merge" | "ci-fail" | "ci-pass" | "alert";
  text: string;
  detail?: string;
  time: string;
  actionUrl?: string;
  actionRoute?: string;
  suggestion?: { text: string; action: string; actionLabel: string };
}

// ─── Agent Task Runner for Epics ──────────────────────────────────────────────

interface TaskStep {
  id: string;
  title: string;
  detail?: string;
  status: "pending" | "active" | "done" | "failed";
}

function EpicAgentRunner({ epic, onClose }: { epic: Epic; onClose: () => void }) {
  const [steps, setSteps] = useState<TaskStep[]>([
    { id: "analyze", title: "Analyzing task requirements", status: "pending" },
    { id: "breakdown", title: "Breaking down into subtasks", status: "pending" },
    { id: "working", title: `Working on: ${epic.tasks[0]?.title || epic.name}`, status: "pending" },
    { id: "implement", title: "Creating implementation", status: "pending" },
    { id: "push", title: "Pushing changes", status: "pending" },
  ]);

  useEffect(() => {
    const timings = [1500, 2000, 2500, 2000, 1500];
    let step = 0;
    let timeout: NodeJS.Timeout;

    function advance() {
      if (step >= 5) return;
      setSteps((prev) =>
        prev.map((s, i) => (i === step ? { ...s, status: "active" } : s))
      );

      timeout = setTimeout(() => {
        const details: Record<number, string> = {
          0: `Identified ${epic.totalTasks} tasks, ${epic.totalTasks - epic.doneTasks} remaining`,
          1: `Prioritized by dependency order`,
          2: `Implementing changes for ${epic.tasks[0]?.title || "next task"}`,
          3: `Generated code, running tests`,
          4: `Committed and pushed to feature branch`,
        };
        setSteps((prev) =>
          prev.map((s, i) => (i === step ? { ...s, status: "done", detail: details[i] } : s))
        );
        step++;
        if (step < 5) advance();
      }, timings[step]);
    }

    advance();
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allDone = steps.every((s) => s.status === "done");

  return (
    <div className="mt-3 rounded-xl border border-warm-gold/20 bg-card/80 overflow-hidden task-runner-enter">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 bg-warm-gold/5">
        <div className="flex items-center gap-2">
          <Bot className="h-3.5 w-3.5 text-warm-gold" />
          <span className="font-data text-[11px] font-medium text-warm-gold">Agent working</span>
        </div>
        <button
          onClick={onClose}
          className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground font-data"
        >
          Dismiss
        </button>
      </div>
      <div className="px-4 py-3 space-y-0">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-start gap-2.5 relative">
            {i < steps.length - 1 && (
              <div className="absolute left-[8px] top-[18px] w-px h-[calc(100%-4px)] bg-border/40" />
            )}
            <div className="shrink-0 relative z-10 mt-0.5">
              {step.status === "done" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 step-done" />
              ) : step.status === "active" ? (
                <div className="h-4 w-4 rounded-full border-2 border-warm-gold flex items-center justify-center step-active">
                  <div className="h-1.5 w-1.5 rounded-full bg-warm-gold animate-pulse" />
                </div>
              ) : (
                <div className="h-4 w-4 rounded-full border border-border/50" />
              )}
            </div>
            <div className="flex-1 pb-2.5 min-w-0">
              <span className={`text-[11px] ${step.status === "active" ? "text-foreground font-medium" : step.status === "done" ? "text-muted-foreground/60" : "text-muted-foreground/30"}`}>
                {step.title}
              </span>
              {step.detail && (
                <p className="text-[10px] text-muted-foreground/40 mt-0.5 step-detail font-data">{step.detail}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      {allDone && (
        <div className="px-4 pb-3 step-detail">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[11px] text-emerald-400 font-data">All steps completed</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Draft Reply Component ────────────────────────────────────────────────────

function DraftReply({ context, onClose }: { context: string; onClose: () => void }) {
  const [draft, setDraft] = useState(`Thanks for the update. Looking into this now — will follow up once I've reviewed the ${context} changes.`);

  return (
    <div className="mt-2 rounded-lg border border-soft-blue/20 bg-card/60 p-3 fade-slide-in">
      <div className="flex items-center gap-1.5 mb-2">
        <MessageSquare className="h-3 w-3 text-soft-blue" />
        <span className="text-[10px] font-data text-soft-blue font-medium">Draft Reply</span>
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="w-full text-[12px] bg-transparent border border-border/30 rounded-md px-2.5 py-2 resize-none leading-relaxed focus:outline-none focus:border-soft-blue/40 text-muted-foreground"
        rows={2}
      />
      <div className="flex items-center gap-2 mt-2">
        <button className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-soft-blue/15 border border-soft-blue/25 text-soft-blue text-[10px] font-medium font-data hover:bg-soft-blue/25 transition-colors">
          <Send className="h-2.5 w-2.5" /> Send
        </button>
        <button onClick={onClose} className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground font-data">
          Cancel
        </button>
      </div>
    </div>
  );
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
    <span className="font-data text-[10px] text-muted-foreground/40 tabular-nums">
      {time.toLocaleTimeString("en-US", { hour12: false })}
    </span>
  );
}

function formatUptime(ms: number | undefined): string {
  if (!ms) return "--";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// Skeleton loader
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

function FeedSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="h-4 w-4 rounded-full shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-[85%]" />
            <Skeleton className="h-2.5 w-[40%]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TaskSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-xl border border-border/30 p-4 space-y-2">
          <Skeleton className="h-4 w-[60%]" />
          <Skeleton className="h-1.5 w-full rounded-full" />
          <Skeleton className="h-3 w-[40%]" />
        </div>
      ))}
    </div>
  );
}

// ─── Garbage event filter ─────────────────────────────────────────────────────

const IGNORED_EVENTS = new Set([
  "presence", "tick", "health", "agent", "heartbeat",
  "connect.challenge", "ping", "pong", "status",
]);

// ─── Intelligent Suggestions ──────────────────────────────────────────────────

function addSuggestions(items: ActivityItem[]): ActivityItem[] {
  return items.map((item) => {
    if (item.icon === "ci-fail") {
      return {
        ...item,
        suggestion: {
          text: "CI checks failing. Want an agent to investigate and fix?",
          action: "fix-agent",
          actionLabel: "Fix with agent",
        },
      };
    }
    if (item.icon === "merge") {
      return {
        ...item,
        suggestion: {
          text: "This merge may unblock related tasks. Review your task board?",
          action: "review-tasks",
          actionLabel: "Review tasks",
        },
      };
    }
    return item;
  });
}

// ─── Activity Feed Builder ────────────────────────────────────────────────────

function buildFeed(
  github: GitHubData | null,
  rawEvents: { id: string; type: string; title: string; description?: string; timestamp: Date; integration: string }[],
): ActivityItem[] {
  const items: ActivityItem[] = [];

  if (github?.prs) {
    for (const pr of github.prs) {
      if (pr.state === "open" && pr.ci?.failing) {
        items.push({
          id: `ci-fail-${pr.url}`,
          icon: "ci-fail",
          text: `${pr.ci.failing} CI check${pr.ci.failing > 1 ? "s" : ""} failing on "${pr.title}"`,
          detail: `${pr.repoName} -- ${pr.ci.failedChecks.map((c) => c.name).join(", ")}`,
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

  for (const ev of rawEvents) {
    if (IGNORED_EVENTS.has(ev.title.toLowerCase())) continue;
    if (IGNORED_EVENTS.has(ev.type)) continue;
    if (ev.type === "alert") {
      items.push({ id: ev.id, icon: "alert", text: ev.title, detail: ev.description, time: ev.timestamp.toISOString() });
    }
  }

  items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  return addSuggestions(items);
}

// ─── Task Breakdown Parser ────────────────────────────────────────────────────

function parseEpics(md: string): Epic[] {
  const epics: Epic[] = [];
  const blocks = md.split(/^### /m).slice(1);

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

    let column: Epic["column"] = "upcoming";
    if (statusLine.includes("in progress") || statusLine.includes("shipped") || statusLine.includes("pr #")) {
      column = "active";
    }
    if (statusLine.includes("not started") && dependsLine.includes("nothing")) {
      column = "upcoming";
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
  commit: "text-soft-blue",
  merge: "text-violet-400",
  "ci-fail": "text-red-400",
  "ci-pass": "text-emerald-400",
  alert: "text-red-400",
};

const colMeta: Record<string, { label: string; accent: string; dot: string; barColor: string }> = {
  active: { label: "In Progress", accent: "border-l-warm-gold", dot: "bg-warm-gold", barColor: "bg-warm-gold" },
  blocked: { label: "Blocked", accent: "border-l-red-500/60", dot: "bg-red-400", barColor: "bg-red-400" },
  upcoming: { label: "Up Next", accent: "border-l-soft-blue/60", dot: "bg-soft-blue", barColor: "bg-soft-blue" },
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
  const [agentRunningEpic, setAgentRunningEpic] = useState<string | null>(null);
  const [draftReplyId, setDraftReplyId] = useState<string | null>(null);

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

  const dots = useMemo(() => {
    const d: { name: string; ok: boolean }[] = [];
    for (const ch of channels) {
      d.push({ name: ch.label || ch.channelType || ch.accountId, ok: !!(ch.running && ch.configured) });
    }
    if (github) d.push({ name: "GitHub", ok: github.authenticated });
    return d;
  }, [channels, github]);

  const feed = useMemo(() => buildFeed(github, rawEvents), [github, rawEvents]);

  const epicsByCol = useMemo(() => {
    const cols: Record<string, Epic[]> = { active: [], blocked: [], upcoming: [] };
    for (const e of epics) cols[e.column]?.push(e);
    return cols;
  }, [epics]);

  const failingPR = github?.prs.find((p) => p.state === "open" && p.ci?.failing);

  const handleSuggestionAction = useCallback((itemId: string, action: string) => {
    if (action === "fix-agent") {
      onNavigate?.("/github");
    } else if (action === "review-tasks") {
      // Scroll to tasks section
    } else if (action === "draft-reply") {
      setDraftReplyId(itemId);
    }
  }, [onNavigate]);

  return (
    <div className="h-full flex flex-col gap-5 overflow-hidden">
      {/* ── Status Bar ── */}
      <div className="flex items-center gap-3 px-1 shrink-0">
        <span className={`h-2 w-2 rounded-full ${status === "connected" ? "bg-emerald-500" : status === "connecting" ? "bg-warm-amber animate-pulse" : "bg-red-500"}`} />
        <span className="text-[10px] font-data text-muted-foreground/50">
          {formatUptime(gatewayInfo?.uptimeMs)} uptime
          <span className="mx-1.5 text-border">|</span>
          {sessions.length} sessions
          <span className="mx-1.5 text-border">|</span>
          {agents.length} agents
        </span>
        <div className="flex items-center gap-2.5 ml-auto">
          {dots.map((d) => (
            <div key={d.name} className="flex items-center gap-1" title={d.name}>
              <span className={`h-1.5 w-1.5 rounded-full ${d.ok ? "bg-emerald-500" : "bg-red-500"}`} />
              <span className="text-[9px] font-data text-muted-foreground/30">{d.name}</span>
            </div>
          ))}
          <DashboardClock />
        </div>
      </div>

      {/* ── CI Alert Banner ── */}
      {failingPR && (
        <button
          onClick={() => onNavigate?.("/github")}
          className="flex items-center gap-3 px-5 py-3 rounded-xl border border-red-500/25 bg-red-500/5 hover:bg-red-500/10 transition-all shrink-0 alert-pulse"
        >
          <XCircle className="h-4 w-4 text-red-400 shrink-0" />
          <div className="flex-1 text-left min-w-0">
            <span className="text-[13px] font-medium text-red-300">
              {failingPR.ci?.failing} CI check{(failingPR.ci?.failing ?? 0) > 1 ? "s" : ""} failing
            </span>
            <span className="text-[12px] text-red-400/50 ml-2 truncate">{failingPR.title}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Bot className="h-3.5 w-3.5 text-warm-gold" />
            <span className="text-[11px] text-warm-gold font-medium font-data">Fix with agent</span>
            <ArrowRight className="h-3 w-3 text-warm-gold/60" />
          </div>
        </button>
      )}

      {/* ── Main Content: 2 columns ── */}
      <div className="flex-1 grid grid-cols-[1fr_400px] gap-6 min-h-0 overflow-hidden">
        {/* LEFT: Activity Feed */}
        <div className="flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between mb-3 px-1 shrink-0">
            <h2 className="font-serif text-xl font-semibold tracking-tight">Activity</h2>
            <button onClick={() => onNavigate?.("/activity")} className="text-[10px] font-data text-muted-foreground/40 hover:text-warm-gold/70 flex items-center gap-1 transition-colors">
              View all <ArrowRight className="h-2.5 w-2.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto rounded-xl border border-border/40 bg-card/40">
            {githubLoading ? (
              <FeedSkeleton />
            ) : feed.length > 0 ? (
              <div className="divide-y divide-border/20 stagger-children">
                {feed.map((item) => {
                  const Icon = feedIcon[item.icon];
                  const color = feedColor[item.icon];
                  return (
                    <div key={item.id} className="px-4 py-3">
                      <button
                        onClick={() => {
                          if (item.actionUrl) window.open(item.actionUrl, "_blank");
                          else if (item.actionRoute) onNavigate?.(item.actionRoute);
                        }}
                        className={`w-full flex items-start gap-3 text-left transition-colors rounded-lg ${item.actionRoute || item.actionUrl ? "hover:opacity-80 cursor-pointer" : ""}`}
                      >
                        <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${color}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] leading-relaxed">{item.text}</p>
                          {item.detail && <p className="text-[10px] font-data text-muted-foreground/35 mt-0.5 truncate">{item.detail}</p>}
                        </div>
                        <span className="text-[9px] font-data text-muted-foreground/25 shrink-0 mt-0.5">{timeAgo(item.time)}</span>
                      </button>

                      {/* Intelligent Suggestion */}
                      {item.suggestion && (
                        <div className="mt-2 ml-7 flex items-start gap-2 fade-slide-in">
                          <Brain className="h-3 w-3 text-warm-gold/70 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-[11px] text-warm-gold/70 leading-relaxed">
                              <TypewriterText text={item.suggestion.text} speed={25} cursor={false} />
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <button
                                onClick={() => handleSuggestionAction(item.id, item.suggestion!.action)}
                                className="text-[10px] font-data font-medium text-warm-gold bg-warm-gold/10 border border-warm-gold/20 px-2 py-0.5 rounded-md hover:bg-warm-gold/20 transition-colors"
                              >
                                {item.suggestion.actionLabel}
                              </button>
                              <button
                                onClick={() => setDraftReplyId(draftReplyId === item.id ? null : item.id)}
                                className="text-[10px] font-data text-soft-blue/70 hover:text-soft-blue transition-colors"
                              >
                                Draft reply
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Draft Reply */}
                      {draftReplyId === item.id && (
                        <div className="ml-7">
                          <DraftReply
                            context={item.detail || "recent"}
                            onClose={() => setDraftReplyId(null)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/30">
                <p className="font-serif text-base">{status === "connected" ? "No activity yet" : "Connecting..."}</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Task Board + GitHub Preview */}
        <div className="flex flex-col gap-6 min-h-0 overflow-y-auto">
          {/* Task Board */}
          <div>
            <h2 className="font-serif text-xl font-semibold tracking-tight mb-3 px-1">Tasks</h2>
            {tasksLoading ? (
              <TaskSkeleton />
            ) : epics.length > 0 ? (
              <div className="space-y-4 stagger-children">
                {(["active", "blocked", "upcoming"] as const).map((col) => {
                  const items = epicsByCol[col];
                  if (!items || items.length === 0) return null;
                  const meta = colMeta[col];
                  return (
                    <div key={col}>
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                        <span className="text-[11px] font-data uppercase tracking-widest text-muted-foreground/40">{meta.label}</span>
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-data ml-auto bg-transparent border-border/40">{items.length}</Badge>
                      </div>
                      <div className="space-y-2">
                        {items.map((epic, i) => (
                          <div key={i} className={`rounded-xl border border-border/30 bg-card/50 border-l-2 ${meta.accent} px-4 py-3.5 card-hover`}>
                            <div className="flex items-center justify-between">
                              <p className="text-[13px] font-medium leading-tight">{epic.name}</p>
                              <span className="text-[10px] font-data text-muted-foreground/35">{epic.doneTasks}/{epic.totalTasks}</span>
                            </div>
                            {/* Progress bar */}
                            <div className="mt-2 h-1 rounded-full bg-border/20 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${meta.barColor} transition-all duration-500`}
                                style={{ width: `${epic.totalTasks > 0 ? (epic.doneTasks / epic.totalTasks) * 100 : 0}%` }}
                              />
                            </div>
                            {epic.tasks.length > 0 && (
                              <div className="mt-2.5 space-y-1">
                                {epic.tasks.slice(0, 3).map((t, j) => (
                                  <div key={j} className="flex items-center gap-2">
                                    <Circle className="h-2 w-2 shrink-0 text-muted-foreground/15" />
                                    <span className="text-[11px] text-muted-foreground/50 truncate">{t.title}</span>
                                  </div>
                                ))}
                                {epic.tasks.length > 3 && (
                                  <span className="text-[10px] text-muted-foreground/25 pl-4 font-data">+{epic.tasks.length - 3} more</span>
                                )}
                              </div>
                            )}
                            {/* Owner & Agent Button */}
                            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/20">
                              {epic.owner ? (
                                <p className="text-[10px] font-data text-muted-foreground/30">{epic.owner}</p>
                              ) : (
                                <span />
                              )}
                              {col !== "blocked" && agentRunningEpic !== epic.name && (
                                <button
                                  onClick={() => setAgentRunningEpic(epic.name)}
                                  className="flex items-center gap-1.5 text-[10px] font-data font-medium text-warm-gold/80 hover:text-warm-gold transition-colors group"
                                >
                                  <Bot className="h-3 w-3 group-hover:scale-110 transition-transform" />
                                  Use agent
                                  <ArrowRight className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 -ml-0.5 transition-opacity" />
                                </button>
                              )}
                            </div>
                            {/* Agent Runner */}
                            {agentRunningEpic === epic.name && (
                              <EpicAgentRunner
                                epic={epic}
                                onClose={() => setAgentRunningEpic(null)}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-border/20 bg-card/30 px-4 py-6 text-center">
                <p className="text-[12px] text-muted-foreground/30">No task breakdown found</p>
              </div>
            )}
          </div>

          {/* GitHub Quick View */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <Github className="h-3.5 w-3.5 text-muted-foreground/40" />
                <h2 className="font-serif text-lg font-semibold tracking-tight">GitHub</h2>
              </div>
              <button onClick={() => onNavigate?.("/github")} className="text-[10px] font-data text-muted-foreground/40 hover:text-warm-gold/70 flex items-center gap-1 transition-colors">
                Full view <ArrowRight className="h-2.5 w-2.5" />
              </button>
            </div>
            {githubLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : github?.authenticated ? (
              <div className="rounded-xl border border-border/30 bg-card/40 overflow-hidden">
                <div className="divide-y divide-border/20">
                  {github.prs.slice(0, 4).map((pr, i) => (
                    <a
                      key={i}
                      href={pr.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-accent/20 transition-colors group"
                    >
                      {pr.state === "merged" ? (
                        <GitMerge className="h-3.5 w-3.5 shrink-0 text-violet-400/60" />
                      ) : (
                        <GitPullRequest className="h-3.5 w-3.5 shrink-0 text-emerald-400/60" />
                      )}
                      <span className="text-[12px] truncate flex-1">{pr.title}</span>
                      {pr.ci?.failing ? (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-data bg-red-500/10 text-red-400 border-red-500/15">fail</Badge>
                      ) : pr.ci?.passing ? (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-data bg-emerald-500/10 text-emerald-400 border-emerald-500/15">pass</Badge>
                      ) : null}
                      <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-0 group-hover:opacity-40 transition-opacity" />
                    </a>
                  ))}
                </div>
                {github.commits.length > 0 && (
                  <div className="border-t border-border/20 py-1">
                    {github.commits.slice(0, 3).map((c, i) => (
                      <div key={i} className="flex items-center gap-2.5 px-4 py-1.5">
                        <GitCommit className="h-2.5 w-2.5 shrink-0 text-muted-foreground/25" />
                        <code className="text-[9px] font-data text-violet-400/40">{c.sha}</code>
                        <span className="text-[11px] text-muted-foreground/40 truncate flex-1">{c.message}</span>
                        <span className="text-[8px] font-data text-muted-foreground/20">{timeAgo(c.date)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-border/20 bg-card/30 px-4 py-4">
                <p className="text-[12px] text-muted-foreground/30">
                  <code className="font-data text-[11px]">gh auth login</code> to connect
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
