"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Github,
  MessageSquare,
  FileText,
  Mail,
  GitPullRequest,
  Brain,
  ChevronLeft,
  ExternalLink,
  Plus,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type AgentStatus = "active" | "idle" | "offline" | "in-development";

interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  color: string;
  status: AgentStatus;
  lastActive: string;
  currentTask: string | null;
  integrations: { name: string; icon: React.ElementType }[];
  tokenUsage: { today: number; total: number };
  capabilities: string[];
  recentActivity: { text: string; time: string }[];
  config: { key: string; value: string }[];
}

const agents: Agent[] = [
  {
    id: "atlas",
    name: "Atlas",
    role: "Chief of Staff / Cofounder Agent",
    description:
      "Always-on executive agent running through OpenClaw. Orchestrates across all integrations, manages priorities, reviews PRs, summarizes threads, and maintains long-term memory. The central nervous system of your workflow.",
    color: "bg-emerald-500",
    status: "active",
    lastActive: "Just now",
    currentTask: "Reviewing PR #248 — websocket reconnect logic",
    integrations: [
      { name: "Discord", icon: MessageSquare },
      { name: "Slack", icon: MessageSquare },
      { name: "GitHub", icon: Github },
      { name: "Notion", icon: FileText },
      { name: "Google", icon: Mail },
    ],
    tokenUsage: { today: 142_800, total: 8_420_000 },
    capabilities: [
      "PR review and code analysis",
      "Slack/Discord thread summarization",
      "Meeting prep and follow-up",
      "Memory indexing and retrieval",
      "Task prioritization and routing",
      "Integration orchestration",
      "Daily briefing generation",
    ],
    recentActivity: [
      { text: "Reviewed PR #248 — websocket reconnect logic", time: "2m ago" },
      { text: "Summarized #eng-general (14 new messages)", time: "8m ago" },
      { text: "Updated memory: architecture decisions", time: "15m ago" },
      { text: "Responded to @sarah in #design-feedback", time: "34m ago" },
      { text: "Synced Sprint 12 tasks from Notion", time: "41m ago" },
    ],
    config: [
      { key: "Runtime", value: "OpenClaw v0.4.2" },
      { key: "Model", value: "claude-opus-4-6" },
      { key: "Memory", value: "Persistent (284 entries)" },
      { key: "Max Tokens/Day", value: "500,000" },
      { key: "Auto-Review PRs", value: "Enabled" },
    ],
  },
  {
    id: "duke",
    name: "Duke",
    role: "Autonomous Coding Agent @ ZetaChain",
    description:
      "Autonomous coding agent deployed across ZetaChain repos. Makes PRs with duke/ branch prefix. Active in ai-portal and anuma-marketing-site. Has its own soul repo for personality and context persistence.",
    color: "bg-violet-500",
    status: "active",
    lastActive: "4m ago",
    currentTask: "Implementing dark mode toggle in ai-portal",
    integrations: [
      { name: "GitHub", icon: Github },
    ],
    tokenUsage: { today: 89_400, total: 3_210_000 },
    capabilities: [
      "Autonomous PR creation (duke/ prefix)",
      "Full-stack implementation",
      "Code review responses",
      "Bug fixing and debugging",
      "Repo-scoped context awareness",
      "Soul repo personality persistence",
    ],
    recentActivity: [
      { text: "Opened PR duke/dark-mode on ai-portal", time: "4m ago" },
      { text: "Pushed 3 commits to duke/nav-refactor", time: "1h ago" },
      { text: "Closed PR #31 after merge on anuma-marketing-site", time: "2h ago" },
      { text: "Responded to review comments on PR #29", time: "3h ago" },
      { text: "Created branch duke/api-cleanup", time: "5h ago" },
    ],
    config: [
      { key: "Active Repos", value: "ai-portal, anuma-marketing-site" },
      { key: "Branch Prefix", value: "duke/" },
      { key: "Soul Repo", value: "duke-soul" },
      { key: "Model", value: "claude-sonnet-4-6" },
      { key: "Auto-PR", value: "Enabled" },
    ],
  },
  {
    id: "anuma",
    name: "Anuma",
    role: "AI Chatbot Product @ ZetaChain",
    description:
      "The AI chatbot product being built at ZetaChain, competing with ChatGPT and Claude. Not an agent you control directly, but a product worth tracking. Currently in active development with the team.",
    color: "bg-amber-500",
    status: "in-development",
    lastActive: "N/A",
    currentTask: null,
    integrations: [],
    tokenUsage: { today: 0, total: 0 },
    capabilities: [
      "Multi-model chat interface",
      "Document analysis and RAG",
      "Code generation and execution",
      "Web search integration",
      "Team collaboration features",
    ],
    recentActivity: [
      { text: "v0.3.0 deployed to staging", time: "1d ago" },
      { text: "RAG pipeline integration merged", time: "2d ago" },
      { text: "UI redesign mockups approved", time: "3d ago" },
      { text: "Load testing completed (p99 < 200ms)", time: "4d ago" },
      { text: "Auth flow refactored to OAuth 2.0", time: "5d ago" },
    ],
    config: [
      { key: "Stage", value: "Active Development" },
      { key: "Version", value: "0.3.0-beta" },
      { key: "Stack", value: "Next.js + Python FastAPI" },
      { key: "Target Launch", value: "Q2 2026" },
      { key: "Team Size", value: "4 engineers" },
    ],
  },
];

function statusColor(status: AgentStatus): string {
  switch (status) {
    case "active":
      return "bg-emerald-500";
    case "idle":
      return "bg-yellow-500";
    case "offline":
      return "bg-zinc-500";
    case "in-development":
      return "bg-amber-500";
  }
}

function statusLabel(status: AgentStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "idle":
      return "Idle";
    case "offline":
      return "Offline";
    case "in-development":
      return "In Development";
  }
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function AgentCard({
  agent,
  onClick,
}: {
  agent: Agent;
  onClick: () => void;
}) {
  return (
    <Card
      className="cursor-pointer hover:border-muted-foreground/30 transition-all duration-200 group"
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div
            className={`flex items-center justify-center h-12 w-12 rounded-xl ${agent.color} shrink-0`}
          >
            <span className="text-lg font-bold text-white">
              {agent.name[0]}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            {/* Name + Status */}
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold">{agent.name}</h3>
              <span
                className={`h-2 w-2 rounded-full ${statusColor(agent.status)} ${agent.status === "active" ? "animate-pulse" : ""}`}
              />
              <Badge
                variant="secondary"
                className="text-[10px] font-mono"
              >
                {statusLabel(agent.status)}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground mt-0.5">
              {agent.role}
            </p>

            {/* Current Task */}
            {agent.currentTask && (
              <div className="mt-3 px-3 py-1.5 rounded-md bg-accent/50 text-xs font-mono text-muted-foreground">
                {agent.currentTask}
              </div>
            )}

            {/* Bottom row: integrations + tokens */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-1">
                {agent.integrations.map((int) => (
                  <Tooltip key={int.name}>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-center h-6 w-6 rounded bg-accent/50">
                        <int.icon className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{int.name}</TooltipContent>
                  </Tooltip>
                ))}
                {agent.integrations.length === 0 && (
                  <span className="text-[10px] text-muted-foreground/50 font-mono">
                    No integrations
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                <span>Today: {formatTokens(agent.tokenUsage.today)}</span>
                <span>Total: {formatTokens(agent.tokenUsage.total)}</span>
              </div>
            </div>

            {/* Last active */}
            <p className="text-[10px] font-mono text-muted-foreground/60 mt-2">
              Last active: {agent.lastActive}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AgentDetail({
  agent,
  onBack,
}: {
  agent: Agent;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div
          className={`flex items-center justify-center h-10 w-10 rounded-xl ${agent.color}`}
        >
          <span className="text-lg font-bold text-white">
            {agent.name[0]}
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{agent.name}</h2>
            <span
              className={`h-2 w-2 rounded-full ${statusColor(agent.status)} ${agent.status === "active" ? "animate-pulse" : ""}`}
            />
            <Badge variant="secondary" className="text-[10px] font-mono">
              {statusLabel(agent.status)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{agent.role}</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        {agent.description}
      </p>

      <div className="grid grid-cols-2 gap-4">
        {/* Capabilities */}
        <Card>
          <CardContent className="pt-5">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Bot className="h-4 w-4 text-muted-foreground" />
              Capabilities
            </h3>
            <ul className="space-y-1.5">
              {agent.capabilities.map((cap) => (
                <li
                  key={cap}
                  className="text-sm text-muted-foreground flex items-start gap-2"
                >
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/50 mt-2 shrink-0" />
                  {cap}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardContent className="pt-5">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <GitPullRequest className="h-4 w-4 text-muted-foreground" />
              Recent Activity
            </h3>
            <div className="space-y-2">
              {agent.recentActivity.map((event, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-sm text-muted-foreground flex-1 truncate">
                    {event.text}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground/60 shrink-0">
                    {event.time}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration */}
      <Card>
        <CardContent className="pt-5">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
            Configuration
          </h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            {agent.config.map((cfg) => (
              <div key={cfg.key} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{cfg.key}</span>
                <span className="text-sm font-mono">{cfg.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Token Usage */}
      <div className="flex items-center gap-6 px-1">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Tokens today:</span>
          <span className="text-sm font-mono font-medium">
            {formatTokens(agent.tokenUsage.today)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Lifetime:</span>
          <span className="text-sm font-mono font-medium">
            {formatTokens(agent.tokenUsage.total)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const selected = agents.find((a) => a.id === selectedAgent);

  if (selected) {
    return (
      <AgentDetail agent={selected} onBack={() => setSelectedAgent(null)} />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Agent Fleet</h2>
          <p className="text-sm text-muted-foreground">
            {agents.filter((a) => a.status === "active").length} active &middot;{" "}
            {agents.length} total
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              disabled
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/50 text-sm text-muted-foreground/50 cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              Spawn Agent
            </button>
          </TooltipTrigger>
          <TooltipContent>Coming soon</TooltipContent>
        </Tooltip>
      </div>

      {/* Agent Cards */}
      <div className="space-y-3">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onClick={() => setSelectedAgent(agent.id)}
          />
        ))}
      </div>
    </div>
  );
}
