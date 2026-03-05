import { type ModuleDefinition } from "./types";

import DashboardPage from "@/modules/dashboard/page";
import AgentsPage from "@/modules/agents/page";
import ActivityPage from "@/modules/activity/page";
import ChatPage from "@/modules/chat/page";
import MemoryPage from "@/modules/memory/page";
import SettingsPage from "@/modules/settings/page";

import dashboardManifest from "@/modules/dashboard/module.json";
import agentsManifest from "@/modules/agents/module.json";
import activityManifest from "@/modules/activity/module.json";
import chatManifest from "@/modules/chat/module.json";
import memoryManifest from "@/modules/memory/module.json";
import settingsManifest from "@/modules/settings/module.json";

const modules: ModuleDefinition[] = [
  { ...dashboardManifest, id: "dashboard", component: DashboardPage },
  { ...agentsManifest, id: "agents", component: AgentsPage },
  { ...activityManifest, id: "activity", component: ActivityPage },
  { ...chatManifest, id: "chat", component: ChatPage },
  { ...memoryManifest, id: "memory", component: MemoryPage },
  { ...settingsManifest, id: "settings", component: SettingsPage },
].sort((a, b) => a.order - b.order);

export function getModules(): ModuleDefinition[] {
  return modules;
}

export function getModuleByRoute(route: string): ModuleDefinition | undefined {
  return modules.find((m) => m.route === route);
}
