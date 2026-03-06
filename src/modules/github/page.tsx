"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  GitPullRequest,
  GitCommit,
  Github,
  Loader2,
  ExternalLink,
  Lock,
  Globe,
  Bot,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Search as SearchIcon,
  MessageSquare,
  Play,
} from "lucide-react";

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

// Agent Task Runner types
interface TaskStep {
  id: string;
  title: string;
  detail?: string;
  status: "pending" | "active" | "done" | "failed";
  timestamp?: string;
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

function prStateBadge(state: string) {
  if (state === "open") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
  if (state === "merged") return "bg-warm-gold/15 text-warm-gold border-warm-gold/20";
  if (state === "closed") return "bg-red-500/15 text-red-400 border-red-500/20";
  return "bg-muted text-muted-foreground";
}

// --- Agent Task Runner Component ---

function AgentTaskRunner({
  pr,
  onClose,
}: {
  pr: GitHubPR;
  onClose: () => void;
}) {
  const [steps, setSteps] = useState<TaskStep[]>([
    { id: "analyze", title: "Analyzing CI logs", status: "pending" },
    { id: "identify", title: "Identifying failures", status: "pending" },
    { id: "investigate", title: "Investigating root cause", status: "pending" },
    { id: "fix", title: "Creating fix", status: "pending" },
    { id: "push", title: "Pushing commit", status: "pending" },
  ]);
  const [currentStep, setCurrentStep] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);

  // Simulate agent execution
  useEffect(() => {
    const timings = [1200, 2000, 2500, 3000, 1500];
    let step = 0;
    let timeout: NodeJS.Timeout;

    function advance() {
      if (step >= steps.length) return;

      setSteps((prev) =>
        prev.map((s, i) => {
          if (i === step) return { ...s, status: "active", timestamp: new Date().toLocaleTimeString() };
          return s;
        })
      );
      setCurrentStep(step);

      timeout = setTimeout(() => {
        setSteps((prev) =>
          prev.map((s, i) => {
            if (i === step) {
              const details: Record<number, string> = {
                0: `Found ${pr.ci?.failing || 0} failed checks in CI output`,
                1: `Failures: ${pr.ci?.failedChecks.map((c) => c.name).join(", ") || "unknown"}`,
                2: "Traced to test assertion mismatch in updated component",
                3: "Patched test expectations to match new behavior",
                4: `Committed to ${pr.repoName}`,
              };
              return { ...s, status: "done", detail: details[i], timestamp: new Date().toLocaleTimeString() };
            }
            return s;
          })
        );
        step++;
        if (step < steps.length) {
          advance();
        }
      }, timings[step]);
    }

    advance();
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allDone = steps.every((s) => s.status === "done");

  return (
    <div className="rounded-xl border border-warm-gold/20 bg-card/50 overflow-hidden task-runner-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/30 bg-warm-gold/5">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-warm-gold/20 flex items-center justify-center">
            <Bot className="h-3.5 w-3.5 text-warm-gold" />
          </div>
          <div>
            <p className="text-[13px] font-medium">atlas-zeta-dev fixing CI</p>
            <p className="text-[10px] font-data text-muted-foreground/50">{pr.title} -- {pr.repoName}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground px-2 py-1 rounded transition-colors"
        >
          Dismiss
        </button>
      </div>

      {/* Step Timeline */}
      <div className="px-5 py-4">
        <div className="space-y-0">
          {steps.map((step, i) => (
            <div key={step.id} className="flex items-start gap-3 relative">
              {/* Vertical line */}
              {i < steps.length - 1 && (
                <div className="absolute left-[11px] top-[22px] w-px h-[calc(100%-6px)] bg-border/50" />
              )}
              {/* Icon */}
              <div className="shrink-0 relative z-10 mt-0.5">
                {step.status === "done" ? (
                  <CheckCircle2 className="h-[22px] w-[22px] text-emerald-400 step-done" />
                ) : step.status === "active" ? (
                  <div className="h-[22px] w-[22px] rounded-full border-2 border-warm-gold flex items-center justify-center step-active">
                    <div className="h-2 w-2 rounded-full bg-warm-gold animate-pulse" />
                  </div>
                ) : step.status === "failed" ? (
                  <XCircle className="h-[22px] w-[22px] text-red-400" />
                ) : (
                  <div className="h-[22px] w-[22px] rounded-full border-2 border-border/50 flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-border/50" />
                  </div>
                )}
              </div>
              {/* Content */}
              <div className="flex-1 pb-4 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[13px] ${step.status === "active" ? "text-foreground font-medium" : step.status === "done" ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
                    {step.title}
                  </span>
                  {step.timestamp && (
                    <span className="text-[9px] font-data text-muted-foreground/30">{step.timestamp}</span>
                  )}
                </div>
                {step.detail && (
                  <p className="text-[11px] text-muted-foreground/50 mt-0.5 step-detail">{step.detail}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Completion */}
      {allDone && (
        <div className="px-5 pb-3 step-detail">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-[12px] text-emerald-400">Agent completed all steps</span>
          </div>
        </div>
      )}

      {/* Collapsible Chat */}
      <div className="border-t border-border/30">
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="w-full flex items-center justify-between px-5 py-2 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <MessageSquare className="h-3 w-3" />
            Chat with agent
          </div>
          {chatOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {chatOpen && (
          <div className="px-5 pb-3">
            <div className="rounded-lg border border-border/30 bg-background/50 px-3 py-2">
              <p className="text-[11px] text-muted-foreground/40 mb-2">Agent chat coming soon...</p>
              <input
                type="text"
                placeholder="Ask the agent about this fix..."
                className="w-full text-[12px] bg-transparent border-none outline-none placeholder:text-muted-foreground/30"
                disabled
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main GitHub Page ---

export default function GitHubPage({ onNavigate }: { onNavigate?: (route: string) => void }) {
  const [github, setGithub] = useState<GitHubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedPR, setExpandedPR] = useState<string | null>(null);
  const [taskRunnerPR, setTaskRunnerPR] = useState<GitHubPR | null>(null);

  useEffect(() => {
    fetch("/api/github")
      .then((r) => r.json())
      .then((d: GitHubData) => setGithub(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleFixWithAgent = useCallback((pr: GitHubPR) => {
    setTaskRunnerPR(pr);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="space-y-3 w-full max-w-md">
          <div className="skeleton h-6 w-48" />
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-6 w-36" />
          <div className="skeleton h-14 w-full" />
        </div>
      </div>
    );
  }

  if (!github?.authenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Github className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground/50">GitHub CLI not authenticated</p>
        <code className="text-xs font-data bg-secondary px-2 py-1 rounded">gh auth login</code>
      </div>
    );
  }

  const openPRs = github.prs.filter((p) => p.state === "open");
  const closedPRs = github.prs.filter((p) => p.state !== "open");

  return (
    <div className="space-y-8">
      {/* Agent Task Runner (when active) */}
      {taskRunnerPR && (
        <AgentTaskRunner
          pr={taskRunnerPR}
          onClose={() => setTaskRunnerPR(null)}
        />
      )}

      {/* Open Pull Requests */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GitPullRequest className="h-4 w-4 text-emerald-400" />
            <h2 className="font-serif text-xl font-semibold tracking-tight">Open Pull Requests</h2>
            <Badge variant="secondary" className="font-data text-[10px] px-1.5 py-0 bg-transparent border-border/40">
              {openPRs.length}
            </Badge>
          </div>
        </div>

        {openPRs.length > 0 ? (
          <div className="rounded-xl border border-border/30 bg-card/50 divide-y divide-border/30 stagger-children">
            {openPRs.map((pr) => {
              const isExpanded = expandedPR === pr.url;
              return (
                <div key={pr.url} className="group card-hover">
                  <div className="flex items-start gap-3 px-5 py-4">
                    <GitPullRequest className="h-4 w-4 mt-0.5 shrink-0 text-emerald-400/60" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <a
                          href={pr.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[13px] font-medium hover:text-soft-blue hover:underline truncate transition-colors"
                        >
                          {pr.title}
                        </a>
                        <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-40 transition-opacity text-soft-blue" />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-data text-muted-foreground/50">{pr.repoName}</span>
                        {pr.ci && (
                          <>
                            {pr.ci.passing > 0 && (
                              <div className="flex items-center gap-0.5">
                                <CheckCircle2 className="h-3 w-3 text-emerald-400/60" />
                                <span className="text-[10px] font-data text-emerald-400/60">{pr.ci.passing}</span>
                              </div>
                            )}
                            {pr.ci.failing > 0 && (
                              <div className="flex items-center gap-0.5 alert-pulse">
                                <XCircle className="h-3 w-3 text-red-400" />
                                <span className="text-[10px] font-data text-red-400">{pr.ci.failing} failing</span>
                              </div>
                            )}
                            {pr.ci.pending > 0 && (
                              <div className="flex items-center gap-0.5">
                                <Clock className="h-3 w-3 text-amber-400/60" />
                                <span className="text-[10px] font-data text-amber-400/60">{pr.ci.pending}</span>
                              </div>
                            )}
                          </>
                        )}
                        <span className="text-[10px] font-data text-muted-foreground/30 ml-auto shrink-0">
                          {timeAgo(pr.updatedAt || pr.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* CI Failure Details */}
                  {pr.ci && pr.ci.failing > 0 && (
                    <div className="mx-5 mb-4">
                      <button
                        onClick={() => setExpandedPR(isExpanded ? null : pr.url)}
                        className="flex items-center gap-1.5 text-[11px] text-red-400/70 hover:text-red-400 transition-colors mb-1"
                      >
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {pr.ci.failing} failed check{pr.ci.failing > 1 ? "s" : ""}
                      </button>

                      {isExpanded && (
                        <div className="rounded-xl border border-red-500/15 bg-red-500/5 px-4 py-3 space-y-1.5 ci-expand">
                          {pr.ci.failedChecks.map((check, ci) => (
                            <div key={ci} className="flex items-center gap-2 alert-pulse">
                              <XCircle className="h-3 w-3 text-red-400/60 shrink-0" />
                              <a
                                href={check.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-red-400/70 hover:text-red-300 truncate"
                              >
                                {check.name}
                              </a>
                              {check.duration && (
                                <span className="text-[9px] font-data text-muted-foreground/30 ml-auto">{check.duration}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => handleFixWithAgent(pr)}
                        className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warm-gold/10 border border-warm-gold/20 text-warm-gold text-[11px] font-medium hover:bg-warm-gold/20 transition-all hover:border-warm-gold/30"
                      >
                        <Bot className="h-3.5 w-3.5" />
                        Fix with Agent
                        <Play className="h-2.5 w-2.5 ml-0.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-border/30 bg-card/40 px-5 py-8 text-center text-sm text-muted-foreground/40">
            No open pull requests
          </div>
        )}
      </section>

      {/* Commit Timeline */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <GitCommit className="h-4 w-4 text-soft-blue/60" />
          <h2 className="font-serif text-xl font-semibold tracking-tight">Recent Commits</h2>
        </div>

        {github.commits.length > 0 ? (
          <div className="rounded-xl border border-border/30 bg-card/50">
            <div className="divide-y divide-border/30 stagger-children">
              {github.commits.map((c) => (
                <a
                  key={c.sha}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-5 py-4 hover:bg-accent/20 transition-colors group card-hover"
                >
                  <div className="h-6 w-6 rounded-full bg-soft-blue/10 flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold text-soft-blue">
                      {c.author.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <code className="text-[10px] font-data text-warm-gold/50 shrink-0">{c.sha}</code>
                  <span className="text-[12px] truncate flex-1">{c.message}</span>
                  <span className="text-[10px] font-data text-muted-foreground/30 shrink-0">
                    {timeAgo(c.date)}
                  </span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground/0 group-hover:text-soft-blue/40 transition-colors shrink-0" />
                </a>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border/30 bg-card/40 px-5 py-6 text-center text-sm text-muted-foreground/40">
            No commits found
          </div>
        )}
      </section>

      {/* Repositories */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Github className="h-4 w-4 text-muted-foreground/50" />
          <h2 className="font-serif text-xl font-semibold tracking-tight">Repositories</h2>
        </div>

        {github.repos.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 stagger-children">
            {github.repos.map((r) => (
              <a
                key={r.name}
                href={r.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-border/30 bg-card/40 px-5 py-4 hover:border-warm-gold/20 transition-colors group card-hover"
              >
                <div className="flex items-center gap-2 mb-1">
                  {r.isPrivate ? (
                    <Lock className="h-3 w-3 text-warm-gold/50" />
                  ) : (
                    <Globe className="h-3 w-3 text-muted-foreground/30" />
                  )}
                  <span className="text-[13px] font-data font-medium">{r.name}</span>
                </div>
                {r.description && (
                  <p className="text-[11px] text-muted-foreground/40 truncate">{r.description}</p>
                )}
                <p className="text-[9px] font-data text-muted-foreground/25 mt-1">
                  updated {timeAgo(r.pushedAt)}
                </p>
              </a>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border/30 bg-card/40 px-5 py-6 text-center text-sm text-muted-foreground/40">
            No repositories found
          </div>
        )}
      </section>

      {/* Recently closed/merged PRs */}
      {closedPRs.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <GitPullRequest className="h-4 w-4 text-muted-foreground/30" />
            <h2 className="font-serif text-xl font-semibold tracking-tight text-muted-foreground/60">Recently Closed</h2>
          </div>
          <div className="rounded-xl border border-border/30 bg-card/40 divide-y divide-border/30 stagger-children">
            {closedPRs.slice(0, 5).map((pr) => (
              <a
                key={pr.url}
                href={pr.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-5 py-4 hover:bg-accent/10 transition-colors text-muted-foreground/50 card-hover"
              >
                <span className="text-[12px] truncate flex-1">{pr.title}</span>
                <Badge variant="secondary" className={`font-data text-[9px] px-1.5 py-0 bg-transparent border-border/40 ${prStateBadge(pr.state)}`}>
                  {pr.state}
                </Badge>
                <span className="text-[10px] font-data text-muted-foreground/25 shrink-0">
                  {timeAgo(pr.updatedAt || pr.createdAt)}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
