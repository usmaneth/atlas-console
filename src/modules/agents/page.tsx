"use client";

import { useState, useEffect, useMemo } from "react";
import { useSessions } from "@/lib/openclaw/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  ChevronLeft,
  ExternalLink,
  Plus,
  Loader2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type AgentStatus = "active" | "idle" | "offline" | "in-development";

interface AgentData {
  id: string;
  name: string;
  workspace?: string;
  agentDir?: string;
  model?: string;
}

function statusColor(status: AgentStatus): string {
  switch (status) {
    case "active": return "bg-emerald-500";
    case "idle": return "bg-yellow-500";
    case "offline": return "bg-zinc-500";
    case "in-development": return "bg-amber-500";
  }
}

function statusLabel(status: AgentStatus): string {
  switch (status) {
    case "active": return "Active";
    case "idle": return "Idle";
    case "offline": return "Offline";
    case "in-development": return "In Development";
  }
}

const agentColors = ["bg-emerald-500", "bg-violet-500", "bg-amber-500", "bg-blue-500", "bg-rose-500", "bg-cyan-500"];

function AgentCard({
  agent,
  agentStatus,
  colorIndex,
  onClick,
}: {
  agent: AgentData;
  agentStatus: AgentStatus;
  colorIndex: number;
  onClick: () => void;
}) {
  const color = agentColors[colorIndex % agentColors.length];
  return (
    <Card
      className="cursor-pointer hover:border-muted-foreground/30 transition-all duration-200 group"
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className={`flex items-center justify-center h-12 w-12 rounded-xl ${color} shrink-0`}>
            <span className="text-lg font-bold text-white">{agent.name[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold">{agent.name}</h3>
              <span className={`h-2 w-2 rounded-full ${statusColor(agentStatus)} ${agentStatus === "active" ? "animate-pulse" : ""}`} />
              <Badge variant="secondary" className="text-[10px] font-mono">{statusLabel(agentStatus)}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{agent.id}</p>

            {agent.model && (
              <div className="mt-3 px-3 py-1.5 rounded-md bg-accent/50 text-xs font-mono text-muted-foreground">
                Model: {agent.model}
              </div>
            )}

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                {agent.workspace && <span className="truncate max-w-[200px]">{agent.workspace}</span>}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AgentDetail({
  agent,
  agentStatus,
  colorIndex,
  onBack,
}: {
  agent: AgentData;
  agentStatus: AgentStatus;
  colorIndex: number;
  onBack: () => void;
}) {
  const color = agentColors[colorIndex % agentColors.length];
  const configEntries = [
    { key: "ID", value: agent.id },
    { key: "Name", value: agent.name },
    ...(agent.model ? [{ key: "Model", value: agent.model }] : []),
    ...(agent.workspace ? [{ key: "Workspace", value: agent.workspace }] : []),
    ...(agent.agentDir ? [{ key: "Agent Dir", value: agent.agentDir }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className={`flex items-center justify-center h-10 w-10 rounded-xl ${color}`}>
          <span className="text-lg font-bold text-white">{agent.name[0]?.toUpperCase()}</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{agent.name}</h2>
            <span className={`h-2 w-2 rounded-full ${statusColor(agentStatus)} ${agentStatus === "active" ? "animate-pulse" : ""}`} />
            <Badge variant="secondary" className="text-[10px] font-mono">{statusLabel(agentStatus)}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{agent.id}</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-5">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
            Configuration
          </h3>
          <div className="grid grid-cols-1 gap-y-2">
            {configEntries.map((cfg) => (
              <div key={cfg.key} className="flex items-start justify-between gap-4">
                <span className="text-sm text-muted-foreground shrink-0">{cfg.key}</span>
                <span className="text-sm font-mono text-right break-all">{cfg.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Bot className="h-4 w-4 text-muted-foreground" />
            Capabilities
          </h3>
          <p className="text-sm text-muted-foreground/50">
            Agent capabilities are determined by their workspace configuration and connected skills.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);
  const { sessions } = useSessions();

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((config) => {
        const list = config?.agents?.list || [];
        setAgents(
          list.map((a: Record<string, unknown>) => ({
            id: a.id as string,
            name: (a.name as string) || (a.id as string),
            workspace: a.workspace as string | undefined,
            agentDir: a.agentDir as string | undefined,
            model: a.model as string | undefined,
          }))
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const agentStatuses = useMemo(() => {
    const statuses: Record<string, AgentStatus> = {};
    for (const agent of agents) {
      const hasSession = sessions.some((s) => s.agent === agent.id || s.key?.includes(agent.id));
      statuses[agent.id] = hasSession ? "active" : "idle";
    }
    return statuses;
  }, [agents, sessions]);

  const selected = agents.find((a) => a.id === selectedAgent);
  const selectedIndex = selected ? agents.indexOf(selected) : 0;

  if (selected) {
    return (
      <AgentDetail
        agent={selected}
        agentStatus={agentStatuses[selected.id] || "idle"}
        colorIndex={selectedIndex}
        onBack={() => setSelectedAgent(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Agent Fleet</h2>
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading..." : `${Object.values(agentStatuses).filter((s) => s === "active").length} active · ${agents.length} total`}
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

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-muted-foreground/50 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading agents from config...
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map((agent, i) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              agentStatus={agentStatuses[agent.id] || "idle"}
              colorIndex={i}
              onClick={() => setSelectedAgent(agent.id)}
            />
          ))}
          {agents.length === 0 && (
            <p className="text-sm text-muted-foreground/50 text-center py-8">
              No agents found in openclaw.json config.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
