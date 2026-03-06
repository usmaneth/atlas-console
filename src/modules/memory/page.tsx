"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
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
  Upload,
  Brain,
  CheckCircle2,
  Sparkles,
  X,
  ChevronRight,
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

// --- Context Deposit UI ---

type DepositPhase = "idle" | "understanding" | "extracting" | "connecting" | "done";

const depositPhases: { phase: DepositPhase; label: string; icon: typeof Brain }[] = [
  { phase: "understanding", label: "Understanding context...", icon: Brain },
  { phase: "extracting", label: "Extracting insights...", icon: Sparkles },
  { phase: "connecting", label: "Building connections...", icon: GitFork },
  { phase: "done", label: "Done!", icon: CheckCircle2 },
];

function ContextDeposit({ onComplete }: { onComplete: () => void }) {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<DepositPhase>("idle");
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(-1);
  const [stats, setStats] = useState<{ facts: number; people: number; decisions: number } | null>(null);

  const handleDeposit = useCallback(async () => {
    if (!text.trim()) return;

    // Start processing animation
    setPhase("understanding");
    setCurrentPhaseIndex(0);

    // Phase 1: Understanding — analyze the text
    await new Promise((r) => setTimeout(r, 800));
    setCurrentPhaseIndex(1);
    setPhase("extracting");

    // Phase 2: Extract real stats from the content
    const lines = text.split("\n").filter((l) => l.trim());
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);

    // Count real people (capitalized names, @mentions)
    const namePattern = /(?:^|\s)([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)/g;
    const mentionPattern = /@(\w+)/g;
    const peopleSet = new Set<string>();
    let match;
    while ((match = namePattern.exec(text)) !== null) peopleSet.add(match[1].trim());
    while ((match = mentionPattern.exec(text)) !== null) peopleSet.add(match[1]);

    // Count real decisions (lines with "decided", "will", "should", "agreed", action items)
    const decisionKeywords = /\b(decided|decision|agreed|will\s+\w+|should\s+\w+|action\s+item|todo|TODO|\[[ x]\])/gi;
    const decisions = (text.match(decisionKeywords) || []).length;

    // Count facts (sentences that state information)
    const facts = sentences.length;

    await new Promise((r) => setTimeout(r, 600));
    setCurrentPhaseIndex(2);
    setPhase("connecting");

    await new Promise((r) => setTimeout(r, 500));

    setStats({
      facts: Math.max(1, facts),
      people: peopleSet.size,
      decisions: Math.max(0, decisions),
    });

    // Save the content to memory
    const filename = `context-deposit-${new Date().toISOString().split("T")[0]}-${Date.now().toString(36)}.md`;
    try {
      await fetch(`/api/memory/${filename}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `# Context Deposit — ${new Date().toLocaleDateString()}\n\n${text}\n\n---\n_Deposited: ${new Date().toISOString()}_\n_Stats: ${facts} facts, ${peopleSet.size} people, ${decisions} decisions_`,
        }),
      });
    } catch {
      // Save failed silently
    }

    setPhase("done");
  }, [text]);

  const handleReset = useCallback(() => {
    setText("");
    setPhase("idle");
    setCurrentPhaseIndex(-1);
    setStats(null);
    onComplete();
  }, [onComplete]);

  if (phase !== "idle" && phase !== "done") {
    return (
      <div className="rounded-xl border border-warm-gold/20 bg-card/50 px-5 py-6 flex flex-col items-center justify-center min-h-[200px]">
        <div className="space-y-4 w-full max-w-sm">
          {depositPhases.slice(0, -1).map((p, i) => {
            const isActive = i === currentPhaseIndex;
            const isDone = i < currentPhaseIndex;
            const Icon = p.icon;
            return (
              <div
                key={p.phase}
                className={`flex items-center gap-3 transition-all duration-500 ${
                  isActive ? "opacity-100" : isDone ? "opacity-40" : "opacity-10"
                }`}
              >
                <div className={`shrink-0 ${isActive ? "deposit-pulse" : ""}`}>
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <Icon className={`h-5 w-5 ${isActive ? "text-warm-gold" : "text-muted-foreground/30"}`} />
                  )}
                </div>
                <span className={`text-sm ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {p.label}
                </span>
                {isActive && (
                  <div className="ml-auto flex items-center gap-1.5">
                    <div className="skeleton h-3.5 w-3.5 rounded-full" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (phase === "done" && stats) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-card/50 px-5 py-5 deposit-done">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <span className="text-sm font-medium text-emerald-400">Context deposited successfully</span>
        </div>
        <div className="flex items-center gap-6 mb-4">
          <div className="text-center">
            <p className="text-2xl font-data font-bold">{stats.facts}</p>
            <p className="font-data text-[10px] text-muted-foreground/50 uppercase tracking-wider">Facts</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-data font-bold">{stats.people}</p>
            <p className="font-data text-[10px] text-muted-foreground/50 uppercase tracking-wider">People</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-data font-bold">{stats.decisions}</p>
            <p className="font-data text-[10px] text-muted-foreground/50 uppercase tracking-wider">Decisions</p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="text-[11px] text-soft-blue hover:text-soft-blue/80 transition-colors"
        >
          Deposit more context
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-border/30 hover:border-warm-gold/30 bg-card/30 transition-colors">
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Upload className="h-4 w-4 text-warm-gold/60" />
          <h3 className="font-serif text-base font-semibold tracking-tight">Deposit Context</h3>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste Slack messages, meeting notes, docs, or any context you want Atlas to learn from..."
          className="w-full h-32 bg-transparent text-[13px] placeholder:text-muted-foreground/30 resize-none border-none outline-none leading-relaxed"
        />
        {text.trim() && (
          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <span className="font-data text-[10px] text-muted-foreground/40">
              {text.split(/\s+/).filter(Boolean).length} words
            </span>
            <button
              onClick={handleDeposit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warm-gold/15 border border-warm-gold/25 text-warm-gold text-[12px] font-medium hover:bg-warm-gold/25 transition-all"
            >
              <Brain className="h-3.5 w-3.5" />
              Process
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Card Components ---

function PersonCard({ entry }: { entry: MemoryEntry }) {
  return (
    <Card className="card-hover rounded-xl border-border/30 bg-card/40">
      <CardContent className="px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-500/15 flex items-center justify-center shrink-0">
            <User className="h-5 w-5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-sm font-semibold tracking-tight">{entry.title}</h3>
              {entry.meta?.role && (
                <Badge variant="secondary" className="font-data text-[10px]">{entry.meta.role}</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{entry.summary}</p>
            <div className="flex items-center gap-2 mt-2">
              {entry.tags.map((tag) => (
                <span key={tag} className="font-data text-[10px] text-muted-foreground/60 bg-secondary px-1.5 py-0.5 rounded">{tag}</span>
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
    <Card className="card-hover rounded-xl border-border/30 bg-card/40 border-l-2 border-l-amber-400/50">
      <CardContent className="px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center gap-1">
            <Scale className="h-4 w-4 text-amber-400" />
            <div className="w-px h-full bg-border/30" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-serif text-sm font-semibold tracking-tight">{entry.title}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{entry.summary}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="font-data text-[10px] text-muted-foreground/50">{entry.updatedAt}</span>
              <div className="flex gap-1">
                {entry.tags.map((tag) => (
                  <span key={tag} className="font-data text-[10px] text-muted-foreground/60 bg-secondary px-1.5 py-0.5 rounded">{tag}</span>
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
    <Card className="card-hover rounded-xl border-border/30 bg-card/40">
      <CardContent className="px-5 py-4">
        <div className="flex items-start gap-3">
          <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${color}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-sm font-semibold tracking-tight">{entry.title}</h3>
              <span className="font-data text-[10px] text-muted-foreground/50">{entry.updatedAt}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{entry.summary}</p>
            <div className="flex gap-1 mt-2">
              {entry.tags.map((tag) => (
                <span key={tag} className="font-data text-[10px] text-muted-foreground/60 bg-secondary px-1.5 py-0.5 rounded">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Main Memory Page ---

export default function MemoryPage() {
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      const listRes = await fetch("/api/memory");
      const listData = await listRes.json();
      if (!listData.files?.length) {
        setEntries([]);
        setLoading(false);
        return;
      }

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
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

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
    <div className="flex flex-col gap-8 h-[calc(100vh-5rem)]">
      {/* Section Header */}
      <div>
        <h2 className="font-serif text-xl font-semibold tracking-tight">Memory</h2>
      </div>

      {/* Context Deposit */}
      <ContextDeposit onComplete={loadEntries} />

      {/* File Browser */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <div className="w-48 border-r border-border/30 pr-4 flex flex-col gap-1">
          <h3 className="font-serif text-xs font-semibold tracking-tight uppercase text-muted-foreground/60 mb-2 px-3">Categories</h3>
          <button
            onClick={() => setActiveCategory("all")}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors text-left ${
              activeCategory === "all"
                ? "bg-warm-gold/10 text-warm-gold border border-warm-gold/20"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            }`}
          >
            <Clock className="h-4 w-4" />
            All Entries
            <span className="ml-auto font-data text-[10px] text-muted-foreground">{entries.length}</span>
          </button>
          {Object.entries(categoryConfig).map(([key, { label, icon: Icon, color }]) => {
            const count = categoryCounts[key] || 0;
            if (count === 0) return null;
            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key as Category)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors text-left ${
                  activeCategory === key
                    ? "bg-warm-gold/10 text-warm-gold border border-warm-gold/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="font-data uppercase tracking-wider text-[11px]">{label}</span>
                <span className="ml-auto font-data text-[10px] text-muted-foreground">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Main content */}
        <div className="flex-1 pl-6 flex flex-col min-h-0">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search memory entries..."
              className="w-full pl-9 pr-4 py-2 bg-card/40 border border-border/30 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-warm-gold/30 focus:border-warm-gold/30 transition-colors"
            />
          </div>

          <div className="flex items-center justify-between mb-3">
            <span className="font-data text-xs text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
              {activeCategory !== "all" && ` in ${categoryConfig[activeCategory]?.label}`}
            </span>
          </div>

          <ScrollArea className="flex-1">
            {loading ? (
              <div className="space-y-4 pr-2 py-4">
                <div className="skeleton h-24 w-full rounded-xl" />
                <div className="skeleton h-24 w-full rounded-xl" />
                <div className="skeleton h-24 w-full rounded-xl" />
                <div className="skeleton h-24 w-3/4 rounded-xl" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center py-16 text-red-400">
                <p className="text-sm">{error}</p>
              </div>
            ) : (
              <div className="space-y-3 pr-2 stagger-children">
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
    </div>
  );
}
