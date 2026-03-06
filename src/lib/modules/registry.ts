import { type ModuleDefinition } from "./types";

import DashboardPage from "@/modules/dashboard/page";
import AgentsPage from "@/modules/agents/page";
import ActivityPage from "@/modules/activity/page";
import ChatPage from "@/modules/chat/page";
import MemoryPage from "@/modules/memory/page";
import SettingsPage from "@/modules/settings/page";
import GitHubPage from "@/modules/github/page";
import NotesPage from "@/modules/notes/page";

import dashboardManifest from "@/modules/dashboard/module.json";
import agentsManifest from "@/modules/agents/module.json";
import activityManifest from "@/modules/activity/module.json";
import chatManifest from "@/modules/chat/module.json";
import memoryManifest from "@/modules/memory/module.json";
import settingsManifest from "@/modules/settings/module.json";
import githubManifest from "@/modules/github/module.json";
import notesManifest from "@/modules/notes/module.json";

const modules: ModuleDefinition[] = [
  { ...dashboardManifest, id: "dashboard", component: DashboardPage },
  { ...githubManifest, id: "github", component: GitHubPage },
  { ...agentsManifest, id: "agents", component: AgentsPage },
  { ...activityManifest, id: "activity", component: ActivityPage },
  { ...chatManifest, id: "chat", component: ChatPage },
  { ...notesManifest, id: "notes", component: NotesPage },
  { ...memoryManifest, id: "memory", component: MemoryPage },
  { ...settingsManifest, id: "settings", component: SettingsPage },
].sort((a, b) => a.order - b.order);

export function getModules(): ModuleDefinition[] {
  return modules;
}

export function getModuleByRoute(route: string): ModuleDefinition | undefined {
  return modules.find((m) => m.route === route);
}
