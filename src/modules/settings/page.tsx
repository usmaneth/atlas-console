"use client";

import { useState, useEffect } from "react";
import { useGateway, useChannels } from "@/lib/openclaw/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Wifi,
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
  Loader2,
} from "lucide-react";

const channelIcons: Record<string, typeof Github> = {
  github: Github,
  discord: MessageSquare,
  slack: MessageSquare,
  notion: FileText,
  google: Mail,
};

const channelColors: Record<string, string> = {
  github: "text-github",
  discord: "text-indigo-400",
  slack: "text-slack",
  notion: "text-notion",
  google: "text-red-400",
};

function StatusIcon({ status }: { status: string }) {
  if (status === "connected") return <CheckCircle className="h-4 w-4 text-emerald-500" />;
  if (status === "error") return <AlertCircle className="h-4 w-4 text-alert" />;
  return <XCircle className="h-4 w-4 text-muted-foreground/50" />;
}

export default function SettingsPage() {
  const { status } = useGateway();
  const { channels } = useChannels();
  const [showToken, setShowToken] = useState(false);
  const [gatewayUrl] = useState(process.env.NEXT_PUBLIC_GATEWAY_URL || "ws://localhost:18789");
  const [token] = useState(process.env.NEXT_PUBLIC_GATEWAY_TOKEN || "");
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [workspace, setWorkspace] = useState<Record<string, string | null> | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => {})
      .finally(() => setLoadingConfig(false));

    fetch("/api/workspace")
      .then((r) => r.json())
      .then(setWorkspace)
      .catch(() => {})
      .finally(() => setLoadingWorkspace(false));
  }, []);

  // Build integration list from WS channel accounts + config fallback
  const integrations = (() => {
    if (channels.length > 0) {
      return channels.map((ch) => {
        const chType = ch.channelType?.toLowerCase() || "system";
        let derivedStatus = "disconnected";
        if (ch.running && ch.configured) derivedStatus = "connected";
        else if (ch.configured && !ch.running && ch.lastError) derivedStatus = "error";
        else if (!ch.configured) derivedStatus = "not configured";
        return {
          name: ch.label || ch.channelType || ch.accountId,
          key: chType,
          icon: channelIcons[chType] || MessageSquare,
          color: channelColors[chType] || "text-muted-foreground",
          status: derivedStatus,
          description: ch.lastError || (ch.configured ? `${ch.label || chType} integration` : "Not configured yet"),
          enabled: ch.enabled ?? false,
        };
      });
    }
    if (config?.channels) {
      return Object.entries(config.channels as Record<string, Record<string, unknown>>).map(([key, ch]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        key,
        icon: channelIcons[key] || MessageSquare,
        color: channelColors[key] || "text-muted-foreground",
        status: (ch.enabled ? "connected" : "disconnected") as string,
        description: "Configured in openclaw.json",
        enabled: ch.enabled as boolean,
      }));
    }
    return [];
  })();

  // Build skills list from config or WS
  const skills = (() => {
    // This would come from skills.status WS call — for now derive from config
    return [
      { name: "gateway-rpc", version: "built-in", status: status === "connected" ? "ready" : "offline" },
    ];
  })();

  // Modules from config
  const modules = [
    { name: "Dashboard", id: "dashboard", enabled: true },
    { name: "Activity", id: "activity", enabled: true },
    { name: "Chat", id: "chat", enabled: true },
    { name: "Memory", id: "memory", enabled: true },
    { name: "Agents", id: "agents", enabled: true },
    { name: "Settings", id: "settings", enabled: true },
  ];

  const [moduleStates, setModuleStates] = useState(
    modules.reduce((acc, m) => ({ ...acc, [m.id]: m.enabled }), {} as Record<string, boolean>)
  );

  const soulContent = workspace?.["SOUL.md"] || null;
  const identityContent = workspace?.["IDENTITY.md"] || null;

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
                readOnly
                className="font-mono text-sm bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Auth Token</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showToken ? "text" : "password"}
                    value={token}
                    readOnly
                    className="font-mono text-sm bg-secondary border-border pr-10"
                  />
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-accent text-sm transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reconnect
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
            {loadingConfig ? (
              <div className="flex items-center gap-2 py-4 text-muted-foreground/50">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading integrations...
              </div>
            ) : integrations.length > 0 ? (
              integrations.map((integration) => (
                <div
                  key={integration.name}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent/30 transition-colors"
                >
                  <StatusIcon status={integration.status} />
                  <integration.icon className={`h-4 w-4 ${integration.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{integration.name}</span>
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
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">{integration.description}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {integration.enabled ? "enabled" : "disabled"}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground/50 py-2">No integrations found in config.</p>
            )}
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4" />
              Skills
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
                    <span className="text-[10px] font-mono text-muted-foreground/50">v{skill.version}</span>
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
            {loadingWorkspace ? (
              <div className="flex items-center gap-2 py-4 text-muted-foreground/50">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading workspace files...
              </div>
            ) : (
              <div className="space-y-4">
                {soulContent && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] font-mono">SOUL.md</Badge>
                      <span className="text-[10px] text-muted-foreground">read-only</span>
                    </div>
                    <pre className="text-xs font-mono text-muted-foreground bg-secondary/50 rounded-lg p-4 whitespace-pre-wrap leading-relaxed overflow-auto max-h-48">
                      {soulContent}
                    </pre>
                  </div>
                )}
                {identityContent && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] font-mono">IDENTITY.md</Badge>
                      <span className="text-[10px] text-muted-foreground">read-only</span>
                    </div>
                    <pre className="text-xs font-mono text-muted-foreground bg-secondary/50 rounded-lg p-4 whitespace-pre-wrap leading-relaxed overflow-auto max-h-48">
                      {identityContent}
                    </pre>
                  </div>
                )}
                {!soulContent && !identityContent && (
                  <p className="text-sm text-muted-foreground/50">No identity files found in workspace.</p>
                )}
              </div>
            )}
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
                    <span className="text-[10px] font-mono text-muted-foreground/50">{mod.id}</span>
                  </div>
                  <Switch
                    checked={moduleStates[mod.id]}
                    onCheckedChange={(checked) =>
                      setModuleStates((prev) => ({ ...prev, [mod.id]: checked }))
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
