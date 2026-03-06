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

function generateInsights(events: ActivityEvent[], prs: GitHubPR[]): SmartInsight[] {
  const insights: SmartInsight[] = [];

  // PR-based insights
  const reviewNeeded = prs.filter((pr) => pr.reviewDecision === "REVIEW_REQUIRED" || pr.state === "open");
  if (reviewNeeded.length > 0) {
    insights.push({
      id: "pr-reviews",
      type: "action",
      title: `${reviewNeeded.length} PR${reviewNeeded.length > 1 ? "s" : ""} need attention`,
      description: reviewNeeded.map((pr) => `#${pr.number} ${pr.title}`).slice(0, 3).join(" • "),
      source: "github",
      priority: "high",
      timestamp: new Date(),
      actionLabel: "Review PRs",
    });
  }

  // Event-based insights
  const recentAlerts = events.filter((e) => e.type === "alert");
  if (recentAlerts.length > 0) {
    insights.push({
      id: "alerts",
      type: "alert",
      title: `${recentAlerts.length} alert${recentAlerts.length > 1 ? "s" : ""} detected`,
      description: recentAlerts[0]?.title || "Check activity feed for details",
      source: "system",
      priority: "high",
      timestamp: new Date(),
    });
  }

  // Always add a suggestion
  if (insights.length === 0) {
    insights.push({
      id: "proactive",
      type: "suggestion",
      title: "All clear — time to build",
      description: "No blockers or urgent items. Good time to pick up a task or review the roadmap.",
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

function QuickStats({ prs, sessions }: { prs: GitHubPR[]; sessions: { id: string }[] }) {
  const stats = [
    { label: "Open PRs", value: prs.filter((p) => p.state === "open").length, icon: GitPullRequest, color: "text-soft-blue" },
    { label: "Sessions", value: sessions.length, icon: Bot, color: "text-warm-gold" },
    { label: "Activity", value: "Live", icon: Activity, color: "text-emerald-400" },
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

  // Fetch GitHub PRs
  useEffect(() => {
    fetch("/api/github?action=prs")
      .then((r) => r.json())
      .then((data) => {
        if (data.prs) setPrs(data.prs);
      })
      .catch(() => {})
      .finally(() => setLoadingPrs(false));
  }, []);

  const insights = useMemo(() => generateInsights(events, prs), [events, prs]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">
          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, Usman
        </h1>
        <p className="text-sm text-muted-foreground/60 mt-1">Here&apos;s what needs your attention.</p>
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Quick Stats */}
      <QuickStats prs={prs} sessions={sessions} />

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
          <SlackFeed />
          <RecentActivity events={events} />
        </div>
      </div>
    </div>
  );
}
