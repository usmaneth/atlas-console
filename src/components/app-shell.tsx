"use client";

import { useState, useMemo, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
import { getModules, getModuleByRoute } from "@/lib/modules/registry";

export function AppShell() {
  const [currentRoute, setCurrentRoute] = useState("/");

  const navigate = useCallback((route: string) => {
    setCurrentRoute(route);
  }, []);

  const CurrentPage = useMemo(() => {
    const mod = getModuleByRoute(currentRoute);
    return mod?.component ?? getModules()[0]?.component ?? (() => null);
  }, [currentRoute]);

  const currentModule = getModuleByRoute(currentRoute);
  const isFullHeight = currentModule?.id === "chat" || currentModule?.id === "notes";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar currentRoute={currentRoute} onNavigate={navigate} />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header — hidden for chat (it has its own) */}
        {!isFullHeight && (
          <header className="flex items-center justify-between h-14 px-8 border-b border-border/30 shrink-0">
            <h1 className="font-serif text-lg font-semibold tracking-tight text-foreground">
              {currentModule?.name ?? "Atlas Console"}
            </h1>
            <span className="font-data text-[10px] text-muted-foreground/40 tracking-wider uppercase">
              Atlas Console
            </span>
          </header>
        )}
        {/* Content */}
        <div className={`flex-1 overflow-auto ${isFullHeight ? "" : "px-8 py-6"}`}>
          <div className={isFullHeight ? "h-full" : "page-enter"}>
            <CurrentPage onNavigate={navigate} />
          </div>
        </div>
      </main>
    </div>
  );
}
