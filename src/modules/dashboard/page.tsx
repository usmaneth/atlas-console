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
} from "lucide-react";

function StatusDot({ status }: { status: string }) {
  const color =
    status === "connected"
      ? "bg-emerald-500"
      : status === "connecting"
        ? "bg-yellow-500 animate-pulse"
        : "bg-red-500";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

export default function DashboardPage() {
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
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Messages Today", value: "—", icon: MessageSquare },
          { label: "PRs Reviewed", value: "—", icon: GitPullRequest },
          { label: "Memory Entries", value: "—", icon: Brain },
          { label: "Active Integrations", value: "—", icon: Zap },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-mono font-semibold mt-1">
                    {stat.value}
                  </p>
                </div>
                <stat.icon className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity Feed + Alerts */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Activity className="h-8 w-8 mb-3 opacity-40" />
              <p className="text-sm">No activity yet</p>
              <p className="text-xs mt-1">
                Activity will appear here once Atlas is connected
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-alert" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {["Ask Atlas", "Check Slack", "Review PRs"].map((action) => (
              <button
                key={action}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors text-left"
              >
                {action}
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
