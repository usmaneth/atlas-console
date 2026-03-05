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

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentRoute={currentRoute} onNavigate={navigate} />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center h-12 px-6 border-b border-border shrink-0">
          <h1 className="text-sm font-medium text-foreground">
            {currentModule?.name ?? "Atlas Console"}
          </h1>
        </header>
        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <CurrentPage onNavigate={navigate} />
        </div>
      </main>
    </div>
  );
}
