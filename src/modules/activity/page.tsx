"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  GitPullRequest,
  MessageSquare,
  Brain,
  FileText,
  AlertTriangle,
  Lightbulb,
  Eye,
  Zap,
  CheckCircle,
  XCircle,
  Github,
} from "lucide-react";

type IntegrationFilter = "all" | "github" | "slack" | "notion" | "discord" | "system";
type TypeFilter = "all" | "read" | "action" | "idea" | "alert";

interface MockEvent {
  id: string;
  type: "read" | "action" | "idea" | "alert";
  integration: "github" | "slack" | "notion" | "discord" | "system";
  title: string;
  description?: string;
  timestamp: Date;
  session: string;
}

const now = new Date();
const h = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
const m = (minsAgo: number) => new Date(now.getTime() - minsAgo * 60 * 1000);

const mockEvents: MockEvent[] = [
  { id: "1", type: "action", integration: "github", title: "Reviewed PR #247 — auth middleware refactor", description: "Approved with 2 comments on error handling", timestamp: m(2), session: "current" },
  { id: "2", type: "read", integration: "slack", title: "Read #eng-general (14 messages)", description: "Key topics: deployment schedule, API versioning", timestamp: m(8), session: "current" },
  { id: "3", type: "action", integration: "system", title: "Updated memory: architecture decisions", description: "Added WebSocket gateway rationale", timestamp: m(15), session: "current" },
  { id: "4", type: "read", integration: "github", title: "CI passed — atlas-console/main build #389", timestamp: m(22), session: "current" },
  { id: "5", type: "action", integration: "discord", title: "Responded to @sarah in #design-feedback", description: "Shared component spacing recommendations", timestamp: m(34), session: "current" },
  { id: "6", type: "read", integration: "notion", title: "Synced Sprint 12 task board", description: "3 tasks moved to In Progress", timestamp: m(41), session: "current" },
  { id: "7", type: "action", integration: "github", title: "Drafted review for PR #245", description: "API rate limiting — suggested token bucket approach", timestamp: h(1), session: "current" },
  { id: "8", type: "idea", integration: "system", title: "Voice input for chat module", description: "Whisper-powered transcription, hold spacebar to talk", timestamp: h(1.2), session: "current" },
  { id: "9", type: "alert", integration: "notion", title: "Notion OAuth token expired", description: "Re-authenticate required in Settings", timestamp: h(2), session: "morning" },
  { id: "10", type: "action", integration: "github", title: "Merged PR #243 — database migration", description: "Added user preferences table", timestamp: h(2.5), session: "morning" },
  { id: "11", type: "read", integration: "slack", title: "Digest: #product-updates (8 messages)", description: "Upcoming launch timeline discussed", timestamp: h(3), session: "morning" },
  { id: "12", type: "action", integration: "discord", title: "Posted daily summary in #atlas-log", description: "Auto-generated from morning session", timestamp: h(3.5), session: "morning" },
  { id: "13", type: "idea", integration: "system", title: "Canvas mode for memory browser", description: "Spatial view with draggable nodes and connections", timestamp: h(4), session: "morning" },
  { id: "14", type: "alert", integration: "github", title: "CI failed on feature/auth branch", description: "Test suite: 2 failures in auth.test.ts", timestamp: h(5), session: "morning" },
  { id: "15", type: "read", integration: "github", title: "Watched 3 new issues on openclaw-gateway", timestamp: h(6), session: "overnight" },
  { id: "16", type: "action", integration: "system", title: "Indexed 3 daily notes from journal", description: "Added to memory under 'daily' category", timestamp: h(7), session: "overnight" },
  { id: "17", type: "read", integration: "slack", title: "Scanned #alerts channel (2 messages)", description: "Production error rate normal, no action needed", timestamp: h(8), session: "overnight" },
  { id: "18", type: "action", integration: "github", title: "Auto-labeled 4 stale issues", description: "Applied 'needs-triage' label", timestamp: h(10), session: "overnight" },
  { id: "19", type: "alert", integration: "system", title: "Memory index rebuild completed", description: "284 entries indexed, 8 new since last build", timestamp: h(11), session: "overnight" },
  { id: "20", type: "idea", integration: "system", title: "Ambient awareness dashboard widget", description: "Passive monitoring display for PRs, Slack mentions, calendar", timestamp: h(12), session: "overnight" },
];

const integrationColors: Record<string, string> = {
  github: "bg-github",
  slack: "bg-slack",
  notion: "bg-notion",
  discord: "bg-indigo-400",
  system: "bg-muted-foreground",
};

const integrationTextColors: Record<string, string> = {
  github: "text-github",
  slack: "text-slack",
  notion: "text-notion",
  discord: "text-indigo-400",
  system: "text-muted-foreground",
};

const typeIcons: Record<string, typeof Eye> = {
  read: Eye,
  action: Zap,
  idea: Lightbulb,
  alert: AlertTriangle,
};

const typeLabels: Record<string, string> = {
  read: "Read",
  action: "Action",
  idea: "Idea",
  alert: "Alert",
};

const sessionLabels: Record<string, string> = {
  current: "Current Session",
  morning: "This Morning",
  overnight: "Overnight",
};

const integrationHealth = [
  { name: "GitHub", status: "connected", icon: Github, color: "text-github", lastSync: "2m ago" },
  { name: "Slack", status: "disconnected", icon: MessageSquare, color: "text-slack", lastSync: "—" },
  { name: "Discord", status: "connected", icon: MessageSquare, color: "text-indigo-400", lastSync: "34m ago" },
  { name: "Notion", status: "error", icon: FileText, color: "text-notion", lastSync: "2h ago" },
];

function HealthStatusIcon({ status }: { status: string }) {
  if (status === "connected") return <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />;
  if (status === "error") return <AlertTriangle className="h-3.5 w-3.5 text-alert" />;
  return <XCircle className="h-3.5 w-3.5 text-muted-foreground/40" />;
}

export default function ActivityPage() {
  const [integrationFilter, setIntegrationFilter] = useState<IntegrationFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const filtered = useMemo(() => {
    return mockEvents.filter((e) => {
      if (integrationFilter !== "all" && e.integration !== integrationFilter) return false;
      if (typeFilter !== "all" && e.type !== typeFilter) return false;
      return true;
    });
  }, [integrationFilter, typeFilter]);

  const grouped = useMemo(() => {
    const groups: Record<string, MockEvent[]> = {};
    for (const event of filtered) {
      if (!groups[event.session]) groups[event.session] = [];
      groups[event.session].push(event);
    }
    return groups;
  }, [filtered]);

  const sessionOrder = ["current", "morning", "overnight"];

  function formatTime(date: Date) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="space-y-6">
      {/* Integration Health */}
      <div className="grid grid-cols-4 gap-3">
        {integrationHealth.map((int) => (
          <Card key={int.name} className="hover:bg-accent/20 transition-colors">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2.5">
                <int.icon className={`h-4 w-4 ${int.color}`} />
                <span className="text-sm font-medium flex-1">{int.name}</span>
                <HealthStatusIcon status={int.status} />
              </div>
              <div className="flex items-center justify-between mt-2">
                <Badge
                  variant="secondary"
                  className={`text-[10px] ${
                    int.status === "connected"
                      ? "text-emerald-400"
                      : int.status === "error"
                        ? "text-alert"
                        : "text-muted-foreground/50"
                  }`}
                >
                  {int.status}
                </Badge>
                <span className="text-[10px] font-mono text-muted-foreground/50">
                  {int.lastSync}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground mr-1">Integration:</span>
          {(["all", "github", "slack", "discord", "notion", "system"] as IntegrationFilter[]).map(
            (f) => (
              <button
                key={f}
                onClick={() => setIntegrationFilter(f)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  integrationFilter === f
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            )
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground mr-1">Type:</span>
          {(["all", "read", "action", "idea", "alert"] as TypeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                typeFilter === f
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              {f === "all" ? "All" : typeLabels[f]}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground font-mono">
          {filtered.length} events
        </span>
      </div>

      {/* Timeline */}
      <ScrollArea className="h-[calc(100vh-20rem)]">
        <div className="space-y-6">
          {sessionOrder.map((sessionKey) => {
            const events = grouped[sessionKey];
            if (!events || events.length === 0) return null;

            return (
              <div key={sessionKey}>
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {sessionLabels[sessionKey]}
                  </h3>
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] font-mono text-muted-foreground/50">
                    {events.length} events
                  </span>
                </div>

                <div className="space-y-1">
                  {events.map((event) => {
                    const TypeIcon = typeIcons[event.type] ?? Activity;
                    return (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/30 transition-colors group"
                      >
                        {/* Integration dot */}
                        <div className="flex flex-col items-center gap-1 pt-1.5">
                          <span
                            className={`h-2 w-2 rounded-full ${integrationColors[event.integration]}`}
                          />
                        </div>

                        {/* Type icon */}
                        <TypeIcon
                          className={`h-4 w-4 mt-0.5 shrink-0 ${
                            event.type === "alert"
                              ? "text-alert"
                              : event.type === "idea"
                                ? "text-yellow-400"
                                : integrationTextColors[event.integration]
                          }`}
                        />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                              {event.title}
                            </span>
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              {typeLabels[event.type]}
                            </Badge>
                          </div>
                          {event.description && (
                            <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">
                              {event.description}
                            </p>
                          )}
                        </div>

                        {/* Time */}
                        <span className="text-[10px] font-mono text-muted-foreground/50 shrink-0 pt-0.5">
                          {formatTime(event.timestamp)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <Activity className="h-8 w-8 mb-3 opacity-30" />
              <p className="text-sm">No events match your filters</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
