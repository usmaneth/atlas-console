"use client";

import { useState, useMemo, useEffect } from "react";
import { useActivity, useChannels } from "@/lib/openclaw/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ActivityEvent } from "@/lib/types";
import {
  Activity,
  MessageSquare,
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

const channelIcons: Record<string, typeof Github> = {
  github: Github,
  slack: MessageSquare,
  discord: MessageSquare,
  notion: FileText,
};

const channelColors: Record<string, string> = {
  github: "text-github",
  slack: "text-slack",
  discord: "text-indigo-400",
  notion: "text-notion",
};

function HealthStatusIcon({ status }: { status: string }) {
  if (status === "connected") return <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />;
  if (status === "error") return <AlertTriangle className="h-3.5 w-3.5 text-alert" />;
  return <XCircle className="h-3.5 w-3.5 text-muted-foreground/40" />;
}

function groupByTime(events: ActivityEvent[]): Record<string, ActivityEvent[]> {
  const now = Date.now();
  const groups: Record<string, ActivityEvent[]> = {};

  for (const event of events) {
    const age = now - event.timestamp.getTime();
    let key: string;
    if (age < 3600000) key = "Last Hour";
    else if (age < 86400000) key = "Today";
    else key = "Earlier";

    if (!groups[key]) groups[key] = [];
    groups[key].push(event);
  }
  return groups;
}

export default function ActivityPage() {
  const { events } = useActivity();
  const { channels } = useChannels();
  const [integrationFilter, setIntegrationFilter] = useState<IntegrationFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("/api/config").then((r) => r.json()).then(setConfig).catch(() => {});
  }, []);

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
          type: ch.channelType?.toLowerCase() || "system",
        };
      });
    }
    if (config?.channels) {
      return Object.entries(config.channels as Record<string, Record<string, unknown>>).map(([key, ch]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        status: (ch.enabled ? "connected" : "disconnected") as string,
        type: key.toLowerCase(),
      }));
    }
    return [];
  }, [channels, config]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (integrationFilter !== "all" && e.integration !== integrationFilter) return false;
      if (typeFilter !== "all" && e.type !== typeFilter) return false;
      return true;
    });
  }, [events, integrationFilter, typeFilter]);

  const grouped = useMemo(() => groupByTime(filtered), [filtered]);
  const groupOrder = ["Last Hour", "Today", "Earlier"];

  function formatTime(date: Date) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="space-y-6">
      {/* Integration Health */}
      <div className="grid grid-cols-4 gap-3">
        {channelList.length > 0 ? (
          channelList.map((ch) => {
            const Icon = channelIcons[ch.type] || MessageSquare;
            const color = channelColors[ch.type] || "text-muted-foreground";
            return (
              <Card key={ch.name} className="hover:bg-accent/20 transition-colors">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 ${color}`} />
                    <span className="text-sm font-medium flex-1">{ch.name}</span>
                    <HealthStatusIcon status={ch.status} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${
                        ch.status === "connected" ? "text-emerald-400" : ch.status === "error" ? "text-alert" : "text-muted-foreground/50"
                      }`}
                    >
                      {ch.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-4 text-sm text-muted-foreground/50 py-2">
            No integrations configured. Activity events will appear here as they stream in.
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground mr-1">Integration:</span>
          {(["all", "github", "slack", "discord", "notion", "system"] as IntegrationFilter[]).map((f) => (
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
          ))}
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
        <span className="text-xs text-muted-foreground font-mono">{filtered.length} events</span>
      </div>

      {/* Timeline */}
      <ScrollArea className="h-[calc(100vh-20rem)]">
        <div className="space-y-6">
          {groupOrder.map((groupKey) => {
            const groupEvents = grouped[groupKey];
            if (!groupEvents || groupEvents.length === 0) return null;

            return (
              <div key={groupKey}>
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{groupKey}</h3>
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] font-mono text-muted-foreground/50">{groupEvents.length} events</span>
                </div>

                <div className="space-y-1">
                  {groupEvents.map((event) => {
                    const TypeIcon = typeIcons[event.type] ?? Activity;
                    return (
                      <div key={event.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/30 transition-colors group">
                        <div className="flex flex-col items-center gap-1 pt-1.5">
                          <span className={`h-2 w-2 rounded-full ${integrationColors[event.integration] || "bg-muted-foreground"}`} />
                        </div>
                        <TypeIcon
                          className={`h-4 w-4 mt-0.5 shrink-0 ${
                            event.type === "alert"
                              ? "text-alert"
                              : event.type === "idea"
                                ? "text-yellow-400"
                                : integrationTextColors[event.integration] || "text-muted-foreground"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{event.title}</span>
                            <Badge variant="secondary" className="text-[10px] shrink-0">{typeLabels[event.type]}</Badge>
                          </div>
                          {event.description && (
                            <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">{event.description}</p>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground/50 shrink-0 pt-0.5">{formatTime(event.timestamp)}</span>
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
              <p className="text-sm">
                {events.length === 0
                  ? "No events yet — activity will appear as events stream from the gateway."
                  : "No events match your filters"}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
