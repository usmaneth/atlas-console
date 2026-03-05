"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Users,
  GitFork,
  Lightbulb,
  Map,
  Calendar,
  Scale,
  User,
  Clock,
} from "lucide-react";

type Category = "all" | "people" | "decisions" | "repos" | "ideas" | "roadmap" | "daily";

interface MemoryEntry {
  id: string;
  category: Category;
  title: string;
  summary: string;
  tags: string[];
  updatedAt: string;
  meta?: Record<string, string>;
}

const categoryConfig: Record<Exclude<Category, "all">, { label: string; icon: typeof Users; color: string }> = {
  people: { label: "People", icon: Users, color: "text-blue-400" },
  decisions: { label: "Decisions", icon: Scale, color: "text-amber-400" },
  repos: { label: "Repos", icon: GitFork, color: "text-github" },
  ideas: { label: "Ideas", icon: Lightbulb, color: "text-yellow-400" },
  roadmap: { label: "Roadmap", icon: Map, color: "text-purple-400" },
  daily: { label: "Daily Notes", icon: Calendar, color: "text-emerald-400" },
};

const mockEntries: MemoryEntry[] = [
  {
    id: "1",
    category: "people",
    title: "Usman Asim",
    summary: "Founder & lead developer. Builds with Next.js, Tauri, TypeScript. Prefers dark themes, dense UIs. Working on Atlas — personal AI command center.",
    tags: ["founder", "developer", "atlas"],
    updatedAt: "2026-03-05",
    meta: { role: "Founder", location: "Remote" },
  },
  {
    id: "2",
    category: "people",
    title: "Sarah Chen",
    summary: "Design advisor. Helped define the Arc-browser-inspired sidebar navigation and Bloomberg terminal density aesthetic.",
    tags: ["design", "advisor", "ui"],
    updatedAt: "2026-03-03",
    meta: { role: "Design Advisor", location: "SF" },
  },
  {
    id: "3",
    category: "decisions",
    title: "Use Tauri over Electron",
    summary: "Decided on Tauri for the desktop shell — smaller binary, Rust backend, native webview. Trade-off: less mature ecosystem but worth the performance gains.",
    tags: ["architecture", "desktop", "tauri"],
    updatedAt: "2026-02-28",
  },
  {
    id: "4",
    category: "decisions",
    title: "Module system over monolithic pages",
    summary: "Each feature is a self-contained module with its own module.json manifest. Allows hot-loading and per-module enable/disable in the future.",
    tags: ["architecture", "modules"],
    updatedAt: "2026-02-25",
  },
  {
    id: "5",
    category: "decisions",
    title: "WebSocket gateway for real-time sync",
    summary: "All communication between Atlas agent and console flows through a single WebSocket. Supports multiplexed channels for chat, activity, and control signals.",
    tags: ["gateway", "websocket", "real-time"],
    updatedAt: "2026-02-20",
  },
  {
    id: "6",
    category: "repos",
    title: "atlas-console",
    summary: "Tauri + Next.js desktop app. The visual command center for Atlas. Modules: dashboard, chat, activity, memory, settings.",
    tags: ["tauri", "nextjs", "desktop"],
    updatedAt: "2026-03-05",
    meta: { language: "TypeScript", stars: "—" },
  },
  {
    id: "7",
    category: "repos",
    title: "openclaw-gateway",
    summary: "WebSocket gateway server. Bridges Atlas agent with console and integrations. Handles auth, routing, and message multiplexing.",
    tags: ["gateway", "websocket", "rust"],
    updatedAt: "2026-03-01",
    meta: { language: "Rust", stars: "—" },
  },
  {
    id: "8",
    category: "ideas",
    title: "Voice input for chat",
    summary: "Add Whisper-powered voice transcription to the chat input. Hold spacebar to talk, release to send. Would make Atlas feel more like Jarvis.",
    tags: ["voice", "whisper", "chat"],
    updatedAt: "2026-03-04",
  },
  {
    id: "9",
    category: "ideas",
    title: "Canvas mode for memory",
    summary: "Spatial canvas view where memory entries are nodes you can arrange, connect, and cluster. Think Obsidian graph view but interactive.",
    tags: ["canvas", "memory", "graph"],
    updatedAt: "2026-03-02",
  },
  {
    id: "10",
    category: "ideas",
    title: "Ambient awareness dashboard",
    summary: "Dashboard widget that shows what Atlas is passively monitoring — new PRs, Slack mentions, calendar events — without being explicitly asked.",
    tags: ["dashboard", "ambient", "monitoring"],
    updatedAt: "2026-03-01",
  },
  {
    id: "11",
    category: "roadmap",
    title: "Phase 5: Integration connectors",
    summary: "Build real connectors for GitHub, Slack, Notion, Google Calendar. Each connector runs as a gateway plugin with OAuth flow.",
    tags: ["integrations", "oauth", "phase-5"],
    updatedAt: "2026-03-05",
  },
  {
    id: "12",
    category: "roadmap",
    title: "Phase 6: Agent autonomy",
    summary: "Let Atlas run background tasks — monitor repos, summarize Slack, draft PR reviews. Requires task queue and approval workflow.",
    tags: ["autonomy", "agent", "phase-6"],
    updatedAt: "2026-03-05",
  },
  {
    id: "13",
    category: "daily",
    title: "2026-03-05",
    summary: "Building Phase 4 of Atlas Console. All 5 modules getting fully functional. Chat has markdown + syntax highlighting now. Memory browser taking shape.",
    tags: ["build", "phase-4"],
    updatedAt: "2026-03-05",
  },
  {
    id: "14",
    category: "daily",
    title: "2026-03-04",
    summary: "Finished Phase 3 — gateway client, WebSocket hooks, provider context. All real-time plumbing in place. Ready for UI buildout.",
    tags: ["gateway", "phase-3"],
    updatedAt: "2026-03-04",
  },
];

function PersonCard({ entry }: { entry: MemoryEntry }) {
  return (
    <Card className="hover:bg-accent/30 transition-colors">
      <CardContent className="pt-5">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-500/15 flex items-center justify-center shrink-0">
            <User className="h-5 w-5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{entry.title}</h3>
              {entry.meta?.role && (
                <Badge variant="secondary" className="text-[10px]">
                  {entry.meta.role}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {entry.summary}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-mono text-muted-foreground/60 bg-secondary px-1.5 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DecisionCard({ entry }: { entry: MemoryEntry }) {
  return (
    <Card className="hover:bg-accent/30 transition-colors border-l-2 border-l-amber-400/50">
      <CardContent className="pt-5">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center gap-1">
            <Scale className="h-4 w-4 text-amber-400" />
            <div className="w-px h-full bg-border" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold">{entry.title}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {entry.summary}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px] font-mono text-muted-foreground/50">
                {entry.updatedAt}
              </span>
              <div className="flex gap-1">
                {entry.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-mono text-muted-foreground/60 bg-secondary px-1.5 py-0.5 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DefaultCard({ entry }: { entry: MemoryEntry }) {
  const config = categoryConfig[entry.category as Exclude<Category, "all">];
  const Icon = config?.icon ?? Lightbulb;
  const color = config?.color ?? "text-muted-foreground";

  return (
    <Card className="hover:bg-accent/30 transition-colors">
      <CardContent className="pt-5">
        <div className="flex items-start gap-3">
          <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${color}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{entry.title}</h3>
              <span className="text-[10px] font-mono text-muted-foreground/50">
                {entry.updatedAt}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {entry.summary}
            </p>
            <div className="flex gap-1 mt-2">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-mono text-muted-foreground/60 bg-secondary px-1.5 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MemoryPage() {
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let entries = mockEntries;
    if (activeCategory !== "all") {
      entries = entries.filter((e) => e.category === activeCategory);
    }
    if (search) {
      const q = search.toLowerCase();
      entries = entries.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.summary.toLowerCase().includes(q) ||
          e.tags.some((t) => t.includes(q))
      );
    }
    return entries;
  }, [activeCategory, search]);

  return (
    <div className="flex h-[calc(100vh-5rem)]">
      {/* Sidebar */}
      <div className="w-48 border-r border-border pr-4 flex flex-col gap-1">
        <button
          onClick={() => setActiveCategory("all")}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
            activeCategory === "all"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          }`}
        >
          <Clock className="h-4 w-4" />
          All Entries
          <span className="ml-auto text-[10px] font-mono text-muted-foreground">
            {mockEntries.length}
          </span>
        </button>
        {(Object.entries(categoryConfig) as [Exclude<Category, "all">, typeof categoryConfig[keyof typeof categoryConfig]][]).map(
          ([key, { label, icon: Icon, color }]) => {
            const count = mockEntries.filter((e) => e.category === key).length;
            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                  activeCategory === key
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                <Icon className={`h-4 w-4 ${color}`} />
                {label}
                <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                  {count}
                </span>
              </button>
            );
          }
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 pl-6 flex flex-col">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search memory entries..."
            className="w-full pl-9 pr-4 py-2 bg-secondary rounded-lg text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
            {activeCategory !== "all" &&
              ` in ${categoryConfig[activeCategory as Exclude<Category, "all">]?.label}`}
          </span>
        </div>

        {/* Entries */}
        <ScrollArea className="flex-1">
          <div className="space-y-3 pr-2">
            {filtered.map((entry) => {
              if (entry.category === "people") return <PersonCard key={entry.id} entry={entry} />;
              if (entry.category === "decisions") return <DecisionCard key={entry.id} entry={entry} />;
              return <DefaultCard key={entry.id} entry={entry} />;
            })}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center py-16 text-muted-foreground">
                <Search className="h-8 w-8 mb-3 opacity-30" />
                <p className="text-sm">No entries found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
