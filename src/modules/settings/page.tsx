"use client";

import { useState } from "react";
import { useGateway } from "@/lib/openclaw/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Wifi,
  Key,
  Puzzle,
  BookOpen,
  Shield,
  Zap,
  Github,
  MessageSquare,
  FileText,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";

const integrations = [
  {
    name: "GitHub",
    icon: Github,
    color: "text-github",
    status: "connected" as const,
    description: "Repository monitoring, PR reviews, issue tracking",
  },
  {
    name: "Slack",
    icon: MessageSquare,
    color: "text-slack",
    status: "disconnected" as const,
    description: "Channel monitoring, DM notifications, thread replies",
  },
  {
    name: "Discord",
    icon: MessageSquare,
    color: "text-indigo-400",
    status: "connected" as const,
    description: "Server monitoring, command responses, voice presence",
  },
  {
    name: "Notion",
    icon: FileText,
    color: "text-notion",
    status: "error" as const,
    description: "Page sync, database queries, content updates",
  },
  {
    name: "Google",
    icon: Mail,
    color: "text-red-400",
    status: "disconnected" as const,
    description: "Calendar events, Gmail summaries, Drive access",
  },
];

const skills = [
  { name: "code-review", version: "1.2.0", status: "ready" },
  { name: "pr-summary", version: "1.0.3", status: "ready" },
  { name: "slack-digest", version: "0.9.1", status: "missing" },
  { name: "meeting-prep", version: "1.1.0", status: "ready" },
  { name: "daily-standup", version: "0.8.0", status: "ready" },
  { name: "research-deep", version: "2.0.0", status: "ready" },
  { name: "notion-sync", version: "0.5.0", status: "missing" },
];

const modules = [
  { name: "Dashboard", id: "dashboard", enabled: true },
  { name: "Activity", id: "activity", enabled: true },
  { name: "Chat", id: "chat", enabled: true },
  { name: "Memory", id: "memory", enabled: true },
  { name: "Settings", id: "settings", enabled: true },
];

const soulContent = `# Atlas — Identity Core

I am Atlas, a personal AI agent. I operate as a command center for Usman —
managing code reviews, monitoring integrations, synthesizing information,
and taking autonomous action when authorized.

## Principles
- Precision over verbosity
- Proactive monitoring, reactive execution
- Memory is sacred — everything important gets remembered
- Context is king — I maintain state across all conversations

## Boundaries
- Never act without authorization on destructive operations
- Always explain reasoning when asked
- Maintain strict data isolation between contexts`;

function StatusIcon({ status }: { status: string }) {
  if (status === "connected")
    return <CheckCircle className="h-4 w-4 text-emerald-500" />;
  if (status === "error")
    return <AlertCircle className="h-4 w-4 text-alert" />;
  return <XCircle className="h-4 w-4 text-muted-foreground/50" />;
}

export default function SettingsPage() {
  const { status } = useGateway();
  const [showToken, setShowToken] = useState(false);
  const [gatewayUrl, setGatewayUrl] = useState(
    process.env.NEXT_PUBLIC_GATEWAY_URL || "ws://localhost:18789"
  );
  const [token, setToken] = useState(
    process.env.NEXT_PUBLIC_GATEWAY_TOKEN || ""
  );
  const [moduleStates, setModuleStates] = useState(
    modules.reduce(
      (acc, m) => ({ ...acc, [m.id]: m.enabled }),
      {} as Record<string, boolean>
    )
  );
  const [integrationStates, setIntegrationStates] = useState(
    integrations.reduce(
      (acc, i) => ({ ...acc, [i.name]: i.status === "connected" }),
      {} as Record<string, boolean>
    )
  );

  return (
    <ScrollArea className="h-[calc(100vh-5rem)]">
      <div className="space-y-6 max-w-2xl pr-4">
        {/* Gateway Connection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wifi className="h-4 w-4" />
              Gateway Connection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    status === "connected"
                      ? "bg-emerald-500"
                      : status === "connecting"
                        ? "bg-yellow-500 animate-pulse"
                        : "bg-red-500"
                  }`}
                />
                <span className="text-sm font-mono capitalize">{status}</span>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Gateway URL</label>
              <Input
                value={gatewayUrl}
                onChange={(e) => setGatewayUrl(e.target.value)}
                className="font-mono text-sm bg-secondary border-border"
                placeholder="ws://localhost:18789"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Auth Token</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showToken ? "text" : "password"}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="font-mono text-sm bg-secondary border-border pr-10"
                    placeholder="Enter gateway token..."
                  />
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showToken ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-accent text-sm transition-colors">
              <RefreshCw className="h-3.5 w-3.5" />
              Test Connection
            </button>
          </CardContent>
        </Card>

        {/* Integrations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Puzzle className="h-4 w-4" />
              Integrations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {integrations.map((integration) => (
              <div
                key={integration.name}
                className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent/30 transition-colors"
              >
                <StatusIcon status={integration.status} />
                <integration.icon
                  className={`h-4 w-4 ${integration.color}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {integration.name}
                    </span>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${
                        integration.status === "connected"
                          ? "text-emerald-400"
                          : integration.status === "error"
                            ? "text-alert"
                            : "text-muted-foreground"
                      }`}
                    >
                      {integration.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                    {integration.description}
                  </p>
                </div>
                <Switch
                  checked={integrationStates[integration.name]}
                  onCheckedChange={(checked) =>
                    setIntegrationStates((prev) => ({
                      ...prev,
                      [integration.name]: checked,
                    }))
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4" />
              Installed Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {skills.map((skill) => (
                <div
                  key={skill.name}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono">{skill.name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground/50">
                      v{skill.version}
                    </span>
                  </div>
                  <Badge
                    variant={skill.status === "ready" ? "default" : "secondary"}
                    className={`text-[10px] ${
                      skill.status === "ready"
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                        : "text-amber-400"
                    }`}
                  >
                    {skill.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              Identity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] font-mono">
                  SOUL.md
                </Badge>
                <span className="text-[10px] text-muted-foreground">read-only</span>
              </div>
              <pre className="text-xs font-mono text-muted-foreground bg-secondary/50 rounded-lg p-4 whitespace-pre-wrap leading-relaxed overflow-auto max-h-64">
                {soulContent}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Modules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4" />
              Installed Modules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {modules.map((mod) => (
                <div
                  key={mod.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm">{mod.name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground/50">
                      {mod.id}
                    </span>
                  </div>
                  <Switch
                    checked={moduleStates[mod.id]}
                    onCheckedChange={(checked) =>
                      setModuleStates((prev) => ({
                        ...prev,
                        [mod.id]: checked,
                      }))
                    }
                    disabled={mod.id === "settings"}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
