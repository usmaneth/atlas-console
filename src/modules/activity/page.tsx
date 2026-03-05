"use client";

import { useActivity } from "@/lib/openclaw/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Filter } from "lucide-react";

const integrationColors: Record<string, string> = {
  github: "text-github",
  slack: "text-slack",
  notion: "text-notion",
  system: "text-muted-foreground",
  discord: "text-indigo-400",
};

const typeLabels: Record<string, string> = {
  read: "Read",
  action: "Action",
  idea: "Idea",
  alert: "Alert",
};

export default function ActivityPage() {
  const { events } = useActivity();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Activity Timeline</h1>
        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Filter className="h-4 w-4" />
          Filter
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            All Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Activity className="h-10 w-10 mb-4 opacity-30" />
              <p className="text-sm font-medium">No activity yet</p>
              <p className="text-xs mt-1">
                Events will stream in once Atlas is connected to the gateway
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <div className="space-y-3">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 px-3 py-2 rounded-md hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex flex-col items-center gap-1 pt-1">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          integrationColors[event.integration] ||
                          "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {event.title}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {typeLabels[event.type] || event.type}
                        </Badge>
                      </div>
                      {event.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {event.description}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                      {event.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
