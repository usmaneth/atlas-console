"use client";

import { useGateway } from "@/lib/openclaw/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Wifi, Key, Puzzle, BookOpen } from "lucide-react";

export default function SettingsPage() {
  const { status } = useGateway();

  const gatewayUrl =
    process.env.NEXT_PUBLIC_GATEWAY_URL || "ws://localhost:18789";
  const hasToken = !!process.env.NEXT_PUBLIC_GATEWAY_TOKEN;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-lg font-semibold">Settings</h1>

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
            <Badge
              variant={status === "connected" ? "default" : "secondary"}
              className="font-mono text-xs capitalize"
            >
              {status}
            </Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">URL</span>
            <span className="text-sm font-mono">{gatewayUrl}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Auth Token</span>
            <div className="flex items-center gap-2">
              <Key className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm font-mono">
                {hasToken ? "Configured" : "Not set"}
              </span>
            </div>
          </div>
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
        <CardContent>
          <div className="space-y-3">
            {[
              { name: "GitHub", color: "text-github" },
              { name: "Slack", color: "text-slack" },
              { name: "Notion", color: "text-notion" },
              { name: "Discord", color: "text-indigo-400" },
              { name: "Google", color: "text-red-400" },
            ].map((integration) => (
              <div
                key={integration.name}
                className="flex items-center justify-between"
              >
                <span
                  className={`text-sm font-medium ${integration.color}`}
                >
                  {integration.name}
                </span>
                <Badge variant="secondary" className="text-xs">
                  Pending
                </Badge>
              </div>
            ))}
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
          <div className="space-y-3">
            {["Dashboard", "Activity", "Chat", "Memory", "Settings"].map(
              (mod) => (
                <div key={mod} className="flex items-center justify-between">
                  <span className="text-sm">{mod}</span>
                  <Badge variant="default" className="text-xs">
                    Active
                  </Badge>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
