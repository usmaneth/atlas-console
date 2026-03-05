"use client";

import { useCallback } from "react";
import { getModules } from "@/lib/modules/registry";
import { useGateway } from "@/lib/openclaw/hooks";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  Activity,
  MessageSquare,
  Brain,
  Settings,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  activity: Activity,
  "message-square": MessageSquare,
  brain: Brain,
  settings: Settings,
};

interface SidebarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

function ConnectionIndicator({ status }: { status: string }) {
  const color =
    status === "connected"
      ? "bg-emerald-500"
      : status === "connecting"
        ? "bg-yellow-500 animate-pulse"
        : "bg-red-500";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center justify-center p-2">
          <span className={`h-2 w-2 rounded-full ${color}`} />
        </div>
      </TooltipTrigger>
      <TooltipContent side="right">
        <span className="capitalize">{status}</span>
      </TooltipContent>
    </Tooltip>
  );
}

export function Sidebar({ currentRoute, onNavigate }: SidebarProps) {
  const { status } = useGateway();
  const modules = getModules();

  const handleNav = useCallback(
    (route: string) => {
      onNavigate(route);
    },
    [onNavigate]
  );

  return (
    <aside className="flex flex-col items-center w-14 bg-sidebar border-r border-sidebar-border py-3 gap-1">
      {/* Logo/Brand */}
      <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-sidebar-accent mb-4">
        <span className="text-sm font-bold text-sidebar-accent-foreground">
          A
        </span>
      </div>

      {/* Module nav */}
      <nav className="flex flex-col items-center gap-1 flex-1">
        {modules.map((mod) => {
          const Icon = iconMap[mod.icon];
          const isActive = currentRoute === mod.route;

          return (
            <Tooltip key={mod.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleNav(mod.route)}
                  className={`flex items-center justify-center h-10 w-10 rounded-lg transition-colors ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  }`}
                >
                  {Icon ? (
                    <Icon className="h-5 w-5" />
                  ) : (
                    <span className="text-xs">{mod.name[0]}</span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{mod.name}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {/* Connection status at bottom */}
      <ConnectionIndicator status={status} />
    </aside>
  );
}
