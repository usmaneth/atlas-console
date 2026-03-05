"use client";

import { useGateway } from "@/lib/openclaw/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  GitPullRequest,
  Brain,
  Zap,
  MessageSquare,
  ArrowRight,
  AlertTriangle,
  Calendar,
  Bell,
  Github,
  FileText,
} from "lucide-react";

interface DashboardProps {
  onNavigate?: (route: string) => void;
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "connected"
      ? "bg-emerald-500"
      : status === "connecting"
        ? "bg-yellow-500 animate-pulse"
        : "bg-red-500";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

const mockActivity = [
  {
    id: "1",
    icon: GitPullRequest,
    color: "text-github",
    title: "Reviewed PR #247 — auth middleware refactor",
    time: "2m ago",
    integration: "github",
  },
  {
    id: "2",
    icon: MessageSquare,
    color: "text-slack",
    title: "Summarized #eng-general (14 new messages)",
    time: "8m ago",
    integration: "slack",
  },
  {
    id: "3",
    icon: Brain,
    color: "text-emerald-400",
    title: "Updated memory: project architecture decisions",
    time: "15m ago",
    integration: "system",
  },
  {
    id: "4",
    icon: Github,
    color: "text-github",
    title: "CI passed on atlas-console/main (build #389)",
    time: "22m ago",
    integration: "github",
  },
  {
    id: "5",
    icon: MessageSquare,
    color: "text-indigo-400",
    title: "Responded to @sarah in #design-feedback",
    time: "34m ago",
    integration: "discord",
  },
  {
    id: "6",
    icon: FileText,
    color: "text-notion",
    title: "Synced Sprint 12 task board from Notion",
    time: "41m ago",
    integration: "notion",
  },
  {
    id: "7",
    icon: GitPullRequest,
    color: "text-github",
    title: "Drafted review for PR #245 — API rate limiting",
    time: "1h ago",
    integration: "github",
  },
  {
    id: "8",
    icon: Brain,
    color: "text-emerald-400",
    title: "Indexed 3 new daily notes from journal",
    time: "1h ago",
    integration: "system",
  },
];

const mockAlerts = [
  {
    id: "1",
    icon: GitPullRequest,
    color: "text-github",
    title: "PR #248 assigned to you",
    subtitle: "openclaw-gateway — fix: websocket reconnect logic",
    time: "5m ago",
    priority: "high" as const,
  },
  {
    id: "2",
    icon: Calendar,
    color: "text-notion",
    title: "Standup in 30 minutes",
    subtitle: "Daily sync — Google Meet",
    time: "in 30m",
    priority: "medium" as const,
  },
  {
    id: "3",
    icon: AlertTriangle,
    color: "text-alert",
    title: "Notion sync failing",
    subtitle: "OAuth token expired — re-authenticate in Settings",
    time: "2h ago",
    priority: "high" as const,
  },
];

export default function DashboardPage({ onNavigate }: DashboardProps) {
  const { status } = useGateway();

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <StatusDot status={status} />
          <span className="text-sm font-mono text-muted-foreground capitalize">
            Gateway {status}
          </span>
        </div>
        <Badge variant="secondary" className="font-mono text-xs">
          Atlas: idle
        </Badge>
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-mono text-muted-foreground">
              GitHub
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-mono text-muted-foreground">
              Discord
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            <span className="text-[10px] font-mono text-muted-foreground">
              Slack
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span className="text-[10px] font-mono text-muted-foreground">
              Notion
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "Messages Today",
            value: "47",
            change: "+12",
            icon: MessageSquare,
          },
          {
            label: "PRs Reviewed",
            value: "6",
            change: "+2",
            icon: GitPullRequest,
          },
          {
            label: "Memory Entries",
            value: "284",
            change: "+8",
            icon: Brain,
          },
          {
            label: "Active Integrations",
            value: "3/5",
            change: "",
            icon: Zap,
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-2xl font-mono font-semibold">
                      {stat.value}
                    </p>
                    {stat.change && (
                      <span className="text-[10px] font-mono text-emerald-400">
                        {stat.change}
                      </span>
                    )}
                  </div>
                </div>
                <stat.icon className="h-5 w-5 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity Feed + Alerts + Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        {/* Activity Feed */}
        <Card className="col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {mockActivity.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-accent/30 transition-colors"
                >
                  <event.icon className={`h-4 w-4 shrink-0 ${event.color}`} />
                  <span className="text-sm truncate flex-1">
                    {event.title}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                    {event.time}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right column: Alerts + Quick Actions */}
        <div className="space-y-4">
          {/* Alerts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4 text-alert" />
                Alerts
                <Badge
                  variant="secondary"
                  className="text-[10px] bg-alert/15 text-alert"
                >
                  {mockAlerts.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {mockAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="px-2 py-2 rounded-md hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <alert.icon
                      className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${alert.color}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {alert.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {alert.subtitle}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                      {alert.time}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {[
                { label: "Ask Atlas", route: "/chat" },
                { label: "Browse Memory", route: "/memory" },
                { label: "View Activity", route: "/activity" },
                { label: "Settings", route: "/settings" },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => onNavigate?.(action.route)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors text-left"
                >
                  {action.label}
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
