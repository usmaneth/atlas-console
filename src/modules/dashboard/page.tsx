"use client";

import { useState, useEffect, useMemo } from "react";
import { useGateway, useActivity, useSessions, useChannels } from "@/lib/openclaw/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ActivityEvent } from "@/lib/types";
import {
  Zap,
  GitPullRequest,
  MessageSquare,
  Brain,
  Clock,
  ArrowRight,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Activity,
  Users,
  Wifi,
  WifiOff,
  Github,
  FileText,
  Bot,
  ExternalLink,
  Hash,
  MessageCircle,
} from "lucide-react";

/* ─── Types ─── */

interface SmartInsight {
  id: string;
  type: "action" | "insight" | "suggestion" | "alert";
  title: string;
  description: string;
  source: string;
  priority: "high" | "medium" | "low";
  timestamp: Date;
  actionLabel?: string;
}

interface GitHubPR {
  number: number;
  title: string;
  author: string;
  state: string;
  url: string;
  repo: string;
  updatedAt: string;
  isDraft: boolean;
  reviewDecision?: string;
}

/* ─── Smart Insights Generator ─── */

function generateInsights(events: ActivityEvent[], prs: GitHubPR[], calendarEvents: CalendarEvent[], unreadEmails: number): SmartInsight[] {
  const insights: SmartInsight[] = [];

  // Calendar: upcoming meeting within 2 hours
  const soonMeetings = calendarEvents.filter((e) => {
    const diff = new Date(e.start).getTime() - Date.now();
    return diff > 0 && diff < 2 * 3600000;
  });
  if (soonMeetings.length > 0) {
    insights.push({
      id: "meeting-soon",
      type: "action",
      title: `${soonMeetings[0].summary} ${soonMeetings.length > 1 ? `(+${soonMeetings.length - 1} more)` : ""}`,
      description: `Starting ${Math.round((new Date(soonMeetings[0].start).getTime() - Date.now()) / 60000)} min from now${soonMeetings[0].attendees ? ` • ${soonMeetings[0].attendees} attendees` : ""}`,
      source: "calendar",
      priority: "high",
      timestamp: new Date(),
      actionLabel: soonMeetings[0].meetLink ? "Join meeting" : undefined,
    });
  }

  // PR-based: failing CI
  const failingPrs = prs.filter((pr) => pr.state === "open");
  if (failingPrs.length > 0) {
    insights.push({
      id: "pr-reviews",
      type: "action",
      title: `${failingPrs.length} open PR${failingPrs.length > 1 ? "s" : ""}`,
      description: failingPrs.map((pr) => pr.title).slice(0, 3).join(" • "),
      source: "github",
      priority: "medium",
      timestamp: new Date(),
      actionLabel: "Review PRs",
    });
  }

  // Unread emails
  if (unreadEmails > 10) {
    insights.push({
      id: "email-pileup",
      type: "insight",
      title: `${unreadEmails} unread emails`,
      description: "Your inbox is piling up — might be worth a quick triage.",
      source: "gmail",
      priority: unreadEmails > 50 ? "high" : "medium",
      timestamp: new Date(),
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "proactive",
      type: "suggestion",
      title: "All clear — time to build",
      description: "No meetings soon, no urgent PRs, inbox is clean. Ship something.",
      source: "atlas",
      priority: "low",
      timestamp: new Date(),
    });
  }

  return insights;
}

/* ─── Components ─── */

function StatusBar() {
  const { status, gatewayInfo } = useGateway();
  const { channels } = useChannels();

  const uptimeStr = useMemo(() => {
    if (!gatewayInfo?.uptimeMs) return "—";
    const hours = Math.floor(gatewayInfo.uptimeMs / 3600000);
    const mins = Math.floor((gatewayInfo.uptimeMs % 3600000) / 60000);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }, [gatewayInfo]);

  const connectedChannels = channels.filter((c) => c.running && c.configured);

  return (
    <div className="flex items-center gap-4 px-5 py-3 rounded-2xl bg-card/40 border border-border/20">
      <div className="flex items-center gap-2">
        {status === "connected" ? (
          <Wifi className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <WifiOff className="h-3.5 w-3.5 text-red-400" />
        )}
        <span className="text-[11px] font-data text-muted-foreground/60 capitalize">{status}</span>
      </div>
      <div className="h-3 w-px bg-border/30" />
      <div className="flex items-center gap-1.5">
        <Clock className="h-3 w-3 text-muted-foreground/40" />
        <span className="text-[11px] font-data text-muted-foreground/60">Uptime: {uptimeStr}</span>
      </div>
      <div className="h-3 w-px bg-border/30" />
      <div className="flex items-center gap-1.5">
        <Zap className="h-3 w-3 text-warm-gold/60" />
        <span className="text-[11px] font-data text-muted-foreground/60">
          {connectedChannels.length} channel{connectedChannels.length !== 1 ? "s" : ""} active
        </span>
      </div>
      <div className="flex-1" />
      <span className="text-[10px] font-data text-muted-foreground/40">
        {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
      </span>
    </div>
  );
}

function InsightCard({ insight }: { insight: SmartInsight }) {
  const iconMap = {
    action: ArrowRight,
    insight: TrendingUp,
    suggestion: Sparkles,
    alert: AlertTriangle,
  };
  const colorMap = {
    action: "text-soft-blue border-l-soft-blue/50",
    insight: "text-emerald-400 border-l-emerald-400/50",
    suggestion: "text-warm-gold border-l-warm-gold/50",
    alert: "text-red-400 border-l-red-400/50",
  };
  const bgMap = {
    action: "bg-soft-blue/10",
    insight: "bg-emerald-400/10",
    suggestion: "bg-warm-gold/10",
    alert: "bg-red-400/10",
  };

  const Icon = iconMap[insight.type];
  const colors = colorMap[insight.type];
  const bg = bgMap[insight.type];

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border-l-2 ${colors} bg-card/40 border border-border/20 hover:bg-accent/20 transition-all group`}>
      <div className={`h-8 w-8 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`h-4 w-4 ${colors.split(" ")[0]}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{insight.title}</h3>
          <Badge variant="secondary" className="text-[9px] font-data uppercase tracking-wider">{insight.source}</Badge>
        </div>
        <p className="text-xs text-muted-foreground/60 mt-1 leading-relaxed">{insight.description}</p>
        {insight.actionLabel && (
          <button className="mt-2 flex items-center gap-1 text-[11px] text-soft-blue hover:text-soft-blue/80 transition-colors">
            {insight.actionLabel}
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function QuickStats({ prs, sessions, unreadEmails }: { prs: GitHubPR[]; sessions: { id: string }[]; unreadEmails: number }) {
  const stats = [
    { label: "Open PRs", value: prs.filter((p) => p.state === "open").length, icon: GitPullRequest, color: "text-soft-blue" },
    { label: "Unread Email", value: unreadEmails, icon: MessageSquare, color: "text-warm-gold" },
    { label: "Agents", value: sessions.length || "—", icon: Bot, color: "text-emerald-400" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="rounded-2xl border-border/20 bg-card/40 hover:bg-card/60 transition-colors">
          <CardContent className="px-5 py-4">
            <div className="flex items-center justify-between">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-2xl font-data font-bold tracking-tight">{stat.value}</span>
            </div>
            <p className="text-[10px] font-data text-muted-foreground/50 uppercase tracking-wider mt-1">{stat.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ─── Slack Feed ─── */

interface SlackFeedItem {
  channel: string;
  channelId: string;
  user: string;
  text: string;
  ts: string;
  replyCount: number;
}

/* ─── Calendar ─── */

interface CalendarEvent {
  summary: string;
  start: string;
  meetLink?: string;
  attendees?: number;
}

function UpcomingCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/google?action=calendar")
      .then((r) => r.json())
      .then((data) => {
        if (data.events) setEvents(data.events);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function formatTime(isoStr: string): string {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const isTomorrow = d.toDateString() === new Date(Date.now() + 86400000).toDateString();
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (isToday) return `Today ${time}`;
    if (isTomorrow) return `Tomorrow ${time}`;
    return `${d.toLocaleDateString("en-US", { weekday: "short" })} ${time}`;
  }

  function isWithinHours(isoStr: string, hours: number): boolean {
    return new Date(isoStr).getTime() - Date.now() < hours * 3600000;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-soft-blue" />
        <h3 className="font-serif text-base font-semibold tracking-tight">Calendar</h3>
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="skeleton h-12 rounded-xl" />
          <div className="skeleton h-12 rounded-xl" />
        </div>
      ) : events.length > 0 ? (
        <div className="space-y-1.5">
          {events.slice(0, 5).map((event, i) => {
            const soon = isWithinHours(event.start, 2);
            return (
              <div
                key={i}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  soon ? "bg-soft-blue/5 border border-soft-blue/15" : "hover:bg-accent/20"
                }`}
              >
                <div className={`h-2 w-2 rounded-full shrink-0 ${soon ? "bg-soft-blue animate-pulse" : "bg-muted-foreground/20"}`} />
                <div className="flex-1 min-w-0">
                  <span className={`text-[13px] ${soon ? "font-medium" : ""}`}>{event.summary}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-data text-muted-foreground/50">{formatTime(event.start)}</span>
                    {event.attendees && event.attendees > 1 && (
                      <span className="text-[10px] font-data text-muted-foreground/30">{event.attendees} people</span>
                    )}
                  </div>
                </div>
                {event.meetLink && (
                  <a
                    href={event.meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-data text-soft-blue hover:text-soft-blue/80 transition-colors shrink-0"
                  >
                    Join
                  </a>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground/40 py-4 text-center">No upcoming events</p>
      )}
    </div>
  );
}

function SlackFeed() {
  const [feed, setFeed] = useState<SlackFeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/slack?action=feed")
      .then((r) => r.json())
      .then((data) => {
        if (data.feed) setFeed(data.feed);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function slackTimeAgo(ts: string): string {
    const diff = Date.now() - parseFloat(ts) * 1000;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  }

  // Clean slack markup
  function cleanText(text: string): string {
    return text
      .replace(/<@[A-Z0-9]+>/g, "@someone")
      .replace(/<#[A-Z0-9]+\|([^>]+)>/g, "#$1")
      .replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, "$2")
      .replace(/<(https?:\/\/[^>]+)>/g, "$1")
      .slice(0, 200);
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="h-4 w-4 text-slack" />
        <h3 className="font-serif text-base font-semibold tracking-tight">Slack</h3>
        <span className="text-[10px] font-data text-muted-foreground/40">{feed.length} messages</span>
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="skeleton h-14 rounded-xl" />
          <div className="skeleton h-14 rounded-xl" />
          <div className="skeleton h-14 rounded-xl" />
        </div>
      ) : feed.length > 0 ? (
        <div className="space-y-1">
          {feed.slice(0, 8).map((item, i) => (
            <div key={`${item.ts}-${i}`} className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-accent/20 transition-colors">
              <Hash className="h-3.5 w-3.5 mt-1 shrink-0 text-slack/50" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-data text-slack/70">#{item.channel}</span>
                  <span className="text-[10px] text-muted-foreground/30">·</span>
                  <span className="text-[11px] font-medium">{item.user}</span>
                  {item.replyCount > 0 && (
                    <Badge variant="secondary" className="text-[9px] font-data px-1 py-0">{item.replyCount} replies</Badge>
                  )}
                </div>
                <p className="text-[12px] text-muted-foreground/60 mt-0.5 truncate">{cleanText(item.text)}</p>
              </div>
              <span className="text-[9px] font-data text-muted-foreground/30 shrink-0 mt-1">{slackTimeAgo(item.ts)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground/40 py-4 text-center rounded-xl bg-card/20 border border-border/10">
          No Slack messages yet — configure SLACK_USER_TOKEN
        </p>
      )}
    </div>
  );
}

function RecentActivity({ events }: { events: ActivityEvent[] }) {
  const recent = events.slice(0, 8);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-serif text-base font-semibold tracking-tight">Recent Activity</h3>
        <span className="text-[10px] font-data text-muted-foreground/40">{events.length} events</span>
      </div>
      <div className="space-y-1">
        {recent.length > 0 ? (
          recent.map((event) => (
            <div key={event.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent/20 transition-colors">
              <span className={`h-2 w-2 rounded-full shrink-0 ${
                event.type === "alert" ? "bg-red-400" : event.type === "idea" ? "bg-warm-gold" : "bg-soft-blue/60"
              }`} />
              <span className="text-[13px] flex-1 truncate">{event.title}</span>
              <span className="text-[10px] font-data text-muted-foreground/40">
                {event.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground/40 py-4 text-center">No events yet — activity streams in real-time from the gateway</p>
        )}
      </div>
    </div>
  );
}

/* ─── Main Dashboard ─── */

export default function DashboardPage() {
  const { events } = useActivity();
  const { sessions } = useSessions();
  const [prs, setPrs] = useState<GitHubPR[]>([]);
  const [loadingPrs, setLoadingPrs] = useState(true);
  const [calEvents, setCalEvents] = useState<CalendarEvent[]>([]);
  const [unreadEmails, setUnreadEmails] = useState(0);

  // Fetch all real data
  useEffect(() => {
    fetch("/api/github")
      .then((r) => r.json())
      .then((data) => {
        if (data.prs) setPrs(data.prs);
      })
      .catch(() => {})
      .finally(() => setLoadingPrs(false));

    fetch("/api/google?action=overview")
      .then((r) => r.json())
      .then((data) => {
        if (data.calendar?.events) setCalEvents(data.calendar.events);
        if (data.gmail?.unreadCount) setUnreadEmails(data.gmail.unreadCount);
      })
      .catch(() => {});
  }, []);

  const insights = useMemo(() => generateInsights(events, prs, calEvents, unreadEmails), [events, prs, calEvents, unreadEmails]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">
          Command Center
        </h1>
        <p className="text-sm text-muted-foreground/60 mt-1">Here&apos;s what needs your attention.</p>
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Quick Stats */}
      <QuickStats prs={prs} sessions={sessions} unreadEmails={unreadEmails} />

      {/* Two Column Layout */}
      <div className="grid grid-cols-5 gap-6">
        {/* Smart Insights - Main Column */}
        <div className="col-span-3 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-warm-gold" />
              <h2 className="font-serif text-lg font-semibold tracking-tight">Smart Insights</h2>
            </div>
            <div className="space-y-3">
              {insights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          </div>

          {/* GitHub PRs */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Github className="h-4 w-4 text-github dark:text-white" />
              <h2 className="font-serif text-lg font-semibold tracking-tight">Pull Requests</h2>
            </div>
            {loadingPrs ? (
              <div className="space-y-2">
                <div className="skeleton h-16 rounded-xl" />
                <div className="skeleton h-16 rounded-xl" />
              </div>
            ) : prs.length > 0 ? (
              <div className="space-y-2">
                {prs.slice(0, 5).map((pr) => (
                  <div key={pr.number} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card/40 border border-border/20 hover:bg-accent/20 transition-colors group">
                    <GitPullRequest className={`h-4 w-4 shrink-0 ${pr.state === "open" ? "text-emerald-400" : "text-purple-400"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{pr.title}</span>
                        {pr.isDraft && <Badge variant="secondary" className="text-[9px] font-data">Draft</Badge>}
                      </div>
                      <p className="text-[11px] text-muted-foreground/50 font-data">
                        #{pr.number} • {pr.repo} • {pr.author}
                      </p>
                    </div>
                    <a href={pr.url} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/40 py-4 text-center rounded-xl bg-card/20 border border-border/10">No open PRs found</p>
            )}
          </div>
        </div>

        {/* Side Column */}
        <div className="col-span-2 space-y-6">
          <UpcomingCalendar />
          <SlackFeed />
          <RecentActivity events={events} />
        </div>
      </div>
    </div>
  );
}
