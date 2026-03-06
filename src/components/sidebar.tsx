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
  Bot,
  Github,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  bot: Bot,
  activity: Activity,
  "message-square": MessageSquare,
  brain: Brain,
  settings: Settings,
  github: Github,
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
        ? "bg-amber-500 animate-pulse"
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
    <aside className="flex flex-col items-center w-[60px] bg-sidebar border-r border-sidebar-border py-4 gap-1.5">
      {/* Logo — Playfair "A" with warm glow */}
      <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-warm-gold/20 to-warm-amber/10 border border-warm-gold/20 logo-glow mb-5">
        <span className="font-serif text-lg font-bold text-warm-gold">
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
                  className={`flex items-center justify-center h-10 w-10 rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-warm-gold/15 text-warm-gold border border-warm-gold/20 shadow-[0_0_8px_-2px_rgba(212,165,116,0.2)]"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                  }`}
                >
                  {Icon ? (
                    <Icon className={`h-[18px] w-[18px] ${isActive ? "" : "opacity-70"}`} />
                  ) : (
                    <span className="text-xs font-medium">{mod.name[0]}</span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-sans text-xs">
                {mod.name}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {/* Connection status at bottom */}
      <ConnectionIndicator status={status} />
    </aside>
  );
}
