"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { useGateway } from "@/lib/openclaw/hooks";
import { getModules } from "@/lib/modules/registry";
import {
  LayoutDashboard,
  Activity,
  MessageSquare,
  Brain,
  Bot,
  Settings,
  Github,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

const iconMap: Record<string, typeof LayoutDashboard> = {
  "layout-dashboard": LayoutDashboard,
  "activity": Activity,
  "message-square": MessageSquare,
  "brain": Brain,
  "bot": Bot,
  "settings": Settings,
  "github": Github,
};

export function Sidebar({ currentRoute, onNavigate }: SidebarProps) {
  const modules = getModules();
  const { status } = useGateway();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex flex-col border-r border-border/30 bg-card/30 backdrop-blur-sm transition-all duration-300 shrink-0 ${
        collapsed ? "w-16" : "w-52"
      }`}
    >
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border/20">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-warm-gold/15 flex items-center justify-center shrink-0 glow">
            <Sparkles className="h-4 w-4 text-warm-gold" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="font-serif text-base font-bold tracking-tight leading-tight">Atlas</h1>
              <p className="text-[10px] font-data text-muted-foreground/40 leading-tight">console</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {modules.map((mod) => {
          const isActive = currentRoute === mod.route;
          const Icon = iconMap[mod.icon] || LayoutDashboard;

          const button = (
            <button
              key={mod.id}
              onClick={() => onNavigate(mod.route)}
              className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 ${
                collapsed ? "px-0 py-2.5 justify-center" : "px-3 py-2.5"
              } ${
                isActive
                  ? "bg-warm-gold/10 text-foreground border border-warm-gold/15 shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
              }`}
            >
              <Icon
                className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                  isActive ? "text-warm-gold" : ""
                }`}
              />
              {!collapsed && (
                <span className="text-[13px] font-medium">{mod.name}</span>
              )}
              {mod.id === "chat" && !collapsed && (
                <span className={`ml-auto h-2 w-2 rounded-full ${
                  status === "connected" ? "bg-emerald-400" : "bg-muted-foreground/30"
                }`} />
              )}
            </button>
          );

          if (collapsed) {
            return (
              <Tooltip key={mod.id}>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {mod.name}
                </TooltipContent>
              </Tooltip>
            );
          }

          return button;
        })}
      </nav>

      {/* Bottom Controls */}
      <div className="px-2 py-3 border-t border-border/20 space-y-1">
        {/* Theme Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={`w-full flex items-center gap-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all duration-200 ${
                collapsed ? "px-0 py-2.5 justify-center" : "px-3 py-2.5"
              }`}
            >
              {theme === "dark" ? (
                <Sun className="h-[18px] w-[18px] shrink-0" />
              ) : (
                <Moon className="h-[18px] w-[18px] shrink-0" />
              )}
              {!collapsed && (
                <span className="text-[13px] font-medium">
                  {theme === "dark" ? "Light mode" : "Dark mode"}
                </span>
              )}
            </button>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right" className="text-xs">
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </TooltipContent>
          )}
        </Tooltip>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`w-full flex items-center gap-3 rounded-xl text-muted-foreground/40 hover:text-muted-foreground hover:bg-accent/30 transition-all duration-200 ${
            collapsed ? "px-0 py-2 justify-center" : "px-3 py-2"
          }`}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span className="text-[11px]">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
