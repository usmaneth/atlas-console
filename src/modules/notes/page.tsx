"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Plus,
  Search,
  Clock,
  Trash2,
  Save,
  Check,
  Sparkles,
  Hash,
  Calendar,
  Users,
  BookOpen,
  ChevronRight,
  MoreHorizontal,
  Bold,
  Italic,
  List,
  Code,
  Heading1,
  Heading2,
  Quote,
  Link,
} from "lucide-react";

/* ─── Types ─── */

interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  isNew?: boolean;
}

const CATEGORIES = [
  { id: "all", label: "All Notes", icon: BookOpen },
  { id: "meeting", label: "Meetings", icon: Calendar },
  { id: "standup", label: "Standups", icon: Users },
  { id: "idea", label: "Ideas", icon: Sparkles },
  { id: "general", label: "General", icon: FileText },
];

const TEMPLATES: Record<string, string> = {
  meeting: `# Meeting Notes — [Topic]
**Date:** ${new Date().toLocaleDateString()}
**Attendees:** 

## Agenda
- 

## Discussion
- 

## Action Items
- [ ] 

## Key Decisions
- 
`,
  standup: `# Standup — ${new Date().toLocaleDateString()}

## Yesterday
- 

## Today
- 

## Blockers
- 
`,
  idea: `# Idea: [Title]

## Problem
What problem does this solve?

## Proposal
How would this work?

## Impact
Why does this matter?

## Open Questions
- 
`,
  general: `# [Title]

`,
};

/* ─── Note Editor ─── */

function NoteEditor({
  note,
  onSave,
  onDelete,
}: {
  note: Note;
  onSave: (id: string, title: string, content: string) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset when note changes
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setSaved(false);
  }, [note.id, note.title, note.content]);

  // Auto-save debounce
  const handleChange = useCallback(
    (newContent: string) => {
      setContent(newContent);
      setSaved(false);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        onSave(note.id, title, newContent);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }, 1500);
    },
    [note.id, title, onSave]
  );

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        onSave(note.id, newTitle, content);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }, 1500);
    },
    [note.id, content, onSave]
  );

  // Insert markdown formatting
  const insertMarkdown = useCallback(
    (prefix: string, suffix: string = "") => {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = content.slice(start, end);
      const newContent =
        content.slice(0, start) + prefix + selected + suffix + content.slice(end);
      handleChange(newContent);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
      }, 0);
    },
    [content, handleChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Cmd/Ctrl+B for bold
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        insertMarkdown("**", "**");
      }
      // Cmd/Ctrl+I for italic
      if ((e.metaKey || e.ctrlKey) && e.key === "i") {
        e.preventDefault();
        insertMarkdown("*", "*");
      }
      // Cmd/Ctrl+S for save
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        onSave(note.id, title, content);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
      // Tab for indent
      if (e.key === "Tab") {
        e.preventDefault();
        const el = textareaRef.current;
        if (!el) return;
        const start = el.selectionStart;
        const newContent = content.slice(0, start) + "  " + content.slice(start);
        handleChange(newContent);
        setTimeout(() => {
          el.setSelectionRange(start + 2, start + 2);
        }, 0);
      }
    },
    [content, title, note.id, onSave, insertMarkdown, handleChange]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-border/20">
        <div className="flex items-center gap-0.5">
          {[
            { icon: Bold, action: () => insertMarkdown("**", "**"), label: "Bold" },
            { icon: Italic, action: () => insertMarkdown("*", "*"), label: "Italic" },
            { icon: Code, action: () => insertMarkdown("`", "`"), label: "Code" },
            { icon: Heading1, action: () => insertMarkdown("# "), label: "H1" },
            { icon: Heading2, action: () => insertMarkdown("## "), label: "H2" },
            { icon: List, action: () => insertMarkdown("- "), label: "List" },
            { icon: Quote, action: () => insertMarkdown("> "), label: "Quote" },
            { icon: Link, action: () => insertMarkdown("[", "](url)"), label: "Link" },
          ].map(({ icon: Icon, action, label }) => (
            <button
              key={label}
              onClick={action}
              title={label}
              className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-accent/50 transition-colors"
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-data fade-slide-in">
              <Check className="h-3 w-3" />
              Saved
            </span>
          )}
          <Badge variant="secondary" className="text-[9px] font-data">{note.category}</Badge>
          <button
            onClick={() => onDelete(note.id)}
            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground/30 hover:text-red-400 hover:bg-red-400/10 transition-colors"
            title="Delete note"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="px-6 pt-6 pb-2">
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="w-full text-2xl font-serif font-bold tracking-tight bg-transparent border-none outline-none placeholder:text-muted-foreground/20"
          placeholder="Untitled Note"
        />
        <p className="text-[10px] font-data text-muted-foreground/30 mt-1">
          Created {note.createdAt.toLocaleDateString()} • Updated {note.updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pb-6">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full h-full bg-transparent text-[13px] leading-relaxed resize-none border-none outline-none placeholder:text-muted-foreground/20 font-[inherit]"
          placeholder="Start writing... (Markdown supported)"
          spellCheck
        />
      </div>
    </div>
  );
}

/* ─── Empty State ─── */

function EmptyEditor() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="h-16 w-16 rounded-2xl bg-warm-gold/10 flex items-center justify-center mb-6">
        <FileText className="h-8 w-8 text-warm-gold/60" />
      </div>
      <h2 className="font-serif text-2xl font-semibold tracking-tight mb-2">Notes</h2>
      <p className="text-sm text-muted-foreground/60 max-w-sm leading-relaxed">
        Meeting notes, ideas, standup prep, or anything else.
        Select a note or create a new one to get started.
      </p>
    </div>
  );
}

/* ─── Main Notes Page ─── */

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Load notes from memory API
  useEffect(() => {
    async function loadNotes() {
      try {
        const res = await fetch("/api/memory");
        const data = await res.json();
        if (!data.files?.length) {
          setLoading(false);
          return;
        }

        const noteFiles = data.files.filter(
          (f: { name: string }) => f.name.startsWith("notes/") && f.name.endsWith(".md")
        );

        const loaded: Note[] = await Promise.all(
          noteFiles.map(async (f: { name: string; modified: string }) => {
            const res = await fetch(`/api/memory/${encodeURIComponent(f.name)}`);
            const d = await res.json();
            const content = d.content || "";
            const titleMatch = content.match(/^#\s+(.+)/m);
            const categoryMatch = f.name.match(/notes\/(\w+)\//);
            return {
              id: f.name,
              title: titleMatch?.[1] || f.name.replace("notes/", "").replace(".md", ""),
              content,
              category: categoryMatch?.[1] || "general",
              tags: [],
              createdAt: new Date(f.modified),
              updatedAt: new Date(f.modified),
            };
          })
        );

        setNotes(loaded);
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    loadNotes();
  }, []);

  const createNote = useCallback(
    (category: string = "general") => {
      const id = `notes/${category}/note-${Date.now().toString(36)}.md`;
      const template = TEMPLATES[category] || TEMPLATES.general;
      const newNote: Note = {
        id,
        title: "Untitled Note",
        content: template,
        category,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isNew: true,
      };
      setNotes((prev) => [newNote, ...prev]);
      setActiveNote(id);

      // Save to API
      fetch(`/api/memory/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: template }),
      }).catch(() => {});
    },
    []
  );

  const saveNote = useCallback((id: string, title: string, content: string) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, title, content, updatedAt: new Date() } : n
      )
    );
    fetch(`/api/memory/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    }).catch(() => {});
  }, []);

  const deleteNote = useCallback(
    (id: string) => {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (activeNote === id) setActiveNote(null);
      // Note: no DELETE endpoint yet — just removes from UI
    },
    [activeNote]
  );

  const filtered = useMemo(() => {
    let result = notes;
    if (activeCategory !== "all") {
      result = result.filter((n) => n.category === activeCategory);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }, [notes, activeCategory, search]);

  const currentNote = notes.find((n) => n.id === activeNote);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] -mt-4 -mx-8">
      {/* Notes Sidebar */}
      <div className="w-72 border-r border-border/30 flex flex-col bg-card/30">
        {/* Header */}
        <div className="px-4 py-4 border-b border-border/20">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-sm font-semibold tracking-tight">Notes</h2>
            <div className="flex items-center gap-1">
              {["meeting", "standup", "idea", "general"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => createNote(cat)}
                  className="h-6 px-2 rounded-md text-[10px] font-data text-muted-foreground/50 hover:text-foreground hover:bg-accent/50 transition-colors capitalize"
                  title={`New ${cat} note`}
                >
                  +{cat.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-8 pr-3 py-1.5 bg-secondary/50 border border-border/20 rounded-lg text-[12px] placeholder:text-muted-foreground/30 outline-none focus:border-warm-gold/30 transition-colors"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="px-2 py-2 border-b border-border/20">
          {CATEGORIES.map((cat) => {
            const count = cat.id === "all" ? notes.length : notes.filter((n) => n.category === cat.id).length;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] transition-colors ${
                  activeCategory === cat.id
                    ? "bg-warm-gold/10 text-foreground"
                    : "text-muted-foreground/60 hover:text-foreground hover:bg-accent/30"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{cat.label}</span>
                <span className="ml-auto font-data text-[10px] text-muted-foreground/30">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Note List */}
        <ScrollArea className="flex-1">
          <div className="px-2 py-2 space-y-0.5">
            {loading ? (
              <div className="space-y-2 px-2 py-4">
                <div className="skeleton h-14 rounded-lg" />
                <div className="skeleton h-14 rounded-lg" />
                <div className="skeleton h-14 rounded-lg" />
              </div>
            ) : filtered.length > 0 ? (
              filtered.map((note) => (
                <button
                  key={note.id}
                  onClick={() => setActiveNote(note.id)}
                  className={`w-full text-left px-3 py-3 rounded-lg transition-colors ${
                    activeNote === note.id
                      ? "bg-warm-gold/10 border border-warm-gold/15"
                      : "hover:bg-accent/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium truncate flex-1">{note.title}</span>
                    {note.isNew && (
                      <span className="h-1.5 w-1.5 rounded-full bg-warm-gold shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground/40 mt-0.5 truncate">
                    {note.content.split("\n").find((l) => l.trim() && !l.startsWith("#"))?.trim().slice(0, 60) || "Empty note"}
                  </p>
                  <span className="text-[9px] font-data text-muted-foreground/25 mt-1 block">
                    {note.updatedAt.toLocaleDateString()}
                  </span>
                </button>
              ))
            ) : (
              <p className="text-[12px] text-muted-foreground/30 text-center py-8">
                {search ? "No notes match your search" : "No notes yet — create one above"}
              </p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Editor */}
      <div className="flex-1 min-w-0">
        {currentNote ? (
          <NoteEditor note={currentNote} onSave={saveNote} onDelete={deleteNote} />
        ) : (
          <EmptyEditor />
        )}
      </div>
    </div>
  );
}
