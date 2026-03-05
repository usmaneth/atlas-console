"use client";

import { useState, useMemo, useEffect } from "react";
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
  FileText,
  Loader2,
} from "lucide-react";

type Category = "all" | "people" | "decisions" | "repos" | "ideas" | "roadmap" | "daily" | "other";

interface MemoryEntry {
  id: string;
  category: Category;
  title: string;
  summary: string;
  tags: string[];
  updatedAt: string;
  meta?: Record<string, string>;
}

const categoryConfig: Record<string, { label: string; icon: typeof Users; color: string }> = {
  people: { label: "People", icon: Users, color: "text-blue-400" },
  decisions: { label: "Decisions", icon: Scale, color: "text-amber-400" },
  repos: { label: "Repos", icon: GitFork, color: "text-github" },
  ideas: { label: "Ideas", icon: Lightbulb, color: "text-yellow-400" },
  roadmap: { label: "Roadmap", icon: Map, color: "text-purple-400" },
  daily: { label: "Daily Notes", icon: Calendar, color: "text-emerald-400" },
  other: { label: "Other", icon: FileText, color: "text-muted-foreground" },
};

function categorizeFile(name: string): Category {
  if (name === "people.md") return "people";
  if (name === "repos.md") return "repos";
  if (name === "ideas.md") return "ideas";
  if (name === "roadmap.md") return "roadmap";
  if (/^\d{4}-\d{2}-\d{2}\.md$/.test(name)) return "daily";
  if (name.includes("decision") || name.includes("plan") || name.includes("action")) return "decisions";
  return "other";
}

function parseMemoryFile(name: string, content: string, modified: string): MemoryEntry[] {
  const category = categorizeFile(name);
  const title = name.replace(/\.md$/, "");

  // For people.md, try to split by ## headings into individual entries
  if (category === "people") {
    const sections = content.split(/^## /m).filter(Boolean);
    if (sections.length > 1) {
      return sections.slice(0).map((section, i) => {
        const lines = section.trim().split("\n");
        const personName = lines[0]?.replace(/^#+\s*/, "").trim() || `Person ${i + 1}`;
        const summary = lines.slice(1).join(" ").trim().slice(0, 300);
        return {
          id: `${name}-${i}`,
          category: "people",
          title: personName,
          summary: summary || "No details available",
          tags: extractTags(section),
          updatedAt: modified.split("T")[0] || "",
        };
      });
    }
  }

  // For daily notes, use the date as title
  if (category === "daily") {
    const summary = content.split("\n").filter((l) => l.trim() && !l.startsWith("#")).slice(0, 3).join(" ").slice(0, 300);
    return [{
      id: name,
      category: "daily",
      title,
      summary: summary || "Daily note",
      tags: extractTags(content),
      updatedAt: modified.split("T")[0] || "",
    }];
  }

  // Default: one entry per file
  const firstLines = content.split("\n").filter((l) => l.trim() && !l.startsWith("#")).slice(0, 4).join(" ").slice(0, 300);
  return [{
    id: name,
    category,
    title: content.match(/^#\s+(.+)/m)?.[1] || title,
    summary: firstLines || "No content",
    tags: extractTags(content),
    updatedAt: modified.split("T")[0] || "",
  }];
}

function extractTags(text: string): string[] {
  const tags = new Set<string>();
  const words = text.toLowerCase();
  const tagKeywords = ["atlas", "openclaw", "github", "discord", "slack", "notion", "tauri", "nextjs", "agent", "gateway", "zetachain"];
  for (const kw of tagKeywords) {
    if (words.includes(kw)) tags.add(kw);
  }
  return [...tags].slice(0, 5);
}

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
                <Badge variant="secondary" className="text-[10px]">{entry.meta.role}</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{entry.summary}</p>
            <div className="flex items-center gap-2 mt-2">
              {entry.tags.map((tag) => (
                <span key={tag} className="text-[10px] font-mono text-muted-foreground/60 bg-secondary px-1.5 py-0.5 rounded">{tag}</span>
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
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{entry.summary}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px] font-mono text-muted-foreground/50">{entry.updatedAt}</span>
              <div className="flex gap-1">
                {entry.tags.map((tag) => (
                  <span key={tag} className="text-[10px] font-mono text-muted-foreground/60 bg-secondary px-1.5 py-0.5 rounded">{tag}</span>
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
  const config = categoryConfig[entry.category];
  const Icon = config?.icon ?? FileText;
  const color = config?.color ?? "text-muted-foreground";

  return (
    <Card className="hover:bg-accent/30 transition-colors">
      <CardContent className="pt-5">
        <div className="flex items-start gap-3">
          <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${color}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{entry.title}</h3>
              <span className="text-[10px] font-mono text-muted-foreground/50">{entry.updatedAt}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{entry.summary}</p>
            <div className="flex gap-1 mt-2">
              {entry.tags.map((tag) => (
                <span key={tag} className="text-[10px] font-mono text-muted-foreground/60 bg-secondary px-1.5 py-0.5 rounded">{tag}</span>
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
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        // Fetch file list
        const listRes = await fetch("/api/memory");
        const listData = await listRes.json();
        if (!listData.files?.length) {
          setEntries([]);
          setLoading(false);
          return;
        }

        // Fetch each file's content
        const allEntries: MemoryEntry[] = [];
        await Promise.all(
          listData.files.map(async (file: { name: string; modified: string }) => {
            try {
              const res = await fetch(`/api/memory/${file.name.split("/").map(encodeURIComponent).join("/")}`);
              const data = await res.json();
              if (data.content) {
                const parsed = parseMemoryFile(file.name, data.content, file.modified);
                allEntries.push(...parsed);
              }
            } catch {
              // skip failed files
            }
          })
        );
        setEntries(allEntries);
      } catch (e) {
        setError("Failed to load memory files");
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = entries;
    if (activeCategory !== "all") {
      result = result.filter((e) => e.category === activeCategory);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.summary.toLowerCase().includes(q) ||
          e.tags.some((t) => t.includes(q))
      );
    }
    return result;
  }, [entries, activeCategory, search]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of entries) {
      counts[e.category] = (counts[e.category] || 0) + 1;
    }
    return counts;
  }, [entries]);

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
          <span className="ml-auto text-[10px] font-mono text-muted-foreground">{entries.length}</span>
        </button>
        {Object.entries(categoryConfig).map(([key, { label, icon: Icon, color }]) => {
          const count = categoryCounts[key] || 0;
          if (count === 0) return null;
          return (
            <button
              key={key}
              onClick={() => setActiveCategory(key as Category)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                activeCategory === key
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              <Icon className={`h-4 w-4 ${color}`} />
              {label}
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Main content */}
      <div className="flex-1 pl-6 flex flex-col">
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

        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
            {activeCategory !== "all" && ` in ${categoryConfig[activeCategory]?.label}`}
          </span>
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <Loader2 className="h-8 w-8 mb-3 animate-spin opacity-40" />
              <p className="text-sm">Loading memory files...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center py-16 text-red-400">
              <p className="text-sm">{error}</p>
            </div>
          ) : (
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
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
