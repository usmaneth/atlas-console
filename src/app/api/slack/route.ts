import { NextResponse } from "next/server";

const SLACK_TOKEN = process.env.SLACK_USER_TOKEN || "";

async function slackApi(method: string, params: Record<string, string> = {}): Promise<Record<string, unknown>> {
  const url = new URL(`https://slack.com/api/${method}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${SLACK_TOKEN}` },
    next: { revalidate: 0 },
  });
  return res.json();
}

interface SlackMessage {
  user?: string;
  text?: string;
  ts?: string;
  thread_ts?: string;
  reply_count?: number;
  reactions?: { name: string; count: number }[];
}

interface SlackUser {
  id: string;
  name: string;
  real_name?: string;
  profile?: { display_name?: string; image_48?: string };
}

// Key channels to monitor
const WATCHED_CHANNELS: Record<string, string> = {
  "C026ALV7KFV": "general",
  "C02747HKLF4": "development",
  "C044KQZ6ZHB": "t-engineering",
  "C046QAWTQES": "standups",
  "C045CAM8N1W": "shipped",
  "C02PJ3QKDME": "bugs",
  "C02R487ASK0": "infrastructure",
  "C0267E5LZMK": "random",
};

// User cache
const userCache = new Map<string, SlackUser>();

async function resolveUsers(userIds: string[]): Promise<Map<string, SlackUser>> {
  const missing = userIds.filter((id) => !userCache.has(id));
  await Promise.all(
    missing.map(async (id) => {
      try {
        const data = await slackApi("users.info", { user: id });
        if (data.ok && data.user) {
          const u = data.user as SlackUser;
          userCache.set(id, u);
        }
      } catch { /* skip */ }
    })
  );
  const result = new Map<string, SlackUser>();
  for (const id of userIds) {
    const cached = userCache.get(id);
    if (cached) result.set(id, cached);
  }
  return result;
}

export async function GET(request: Request) {
  if (!SLACK_TOKEN) {
    return NextResponse.json({ error: "Slack token not configured", channels: [], feed: [] });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "feed";
  const channelId = searchParams.get("channel");
  const limit = parseInt(searchParams.get("limit") || "10");

  try {
    if (action === "channels") {
      // Return list of watched channels with latest message
      const channels = await Promise.all(
        Object.entries(WATCHED_CHANNELS).map(async ([id, name]) => {
          try {
            const data = await slackApi("conversations.history", { channel: id, limit: "1" });
            const msgs = (data.messages || []) as SlackMessage[];
            const latest = msgs[0];
            return {
              id,
              name,
              latestText: latest?.text?.slice(0, 100) || null,
              latestTs: latest?.ts || null,
              latestUser: latest?.user || null,
            };
          } catch {
            return { id, name, latestText: null, latestTs: null, latestUser: null };
          }
        })
      );
      return NextResponse.json({ channels });
    }

    if (action === "history" && channelId) {
      // Get channel history
      const data = await slackApi("conversations.history", {
        channel: channelId,
        limit: String(limit),
      });
      const msgs = ((data.messages || []) as SlackMessage[]).reverse();

      // Resolve user names
      const userIds = [...new Set(msgs.map((m) => m.user).filter(Boolean) as string[])];
      const users = await resolveUsers(userIds);

      const messages = msgs.map((m) => {
        const user = users.get(m.user || "");
        return {
          user: user?.profile?.display_name || user?.real_name || user?.name || m.user || "unknown",
          userId: m.user,
          text: m.text || "",
          ts: m.ts,
          threadTs: m.thread_ts,
          replyCount: m.reply_count || 0,
          reactions: m.reactions || [],
        };
      });

      return NextResponse.json({
        channel: WATCHED_CHANNELS[channelId] || channelId,
        messages,
      });
    }

    if (action === "feed") {
      // Aggregate feed from all watched channels (last 3 msgs each)
      const feed: {
        channel: string;
        channelId: string;
        user: string;
        userId: string;
        text: string;
        ts: string;
        replyCount: number;
      }[] = [];

      await Promise.all(
        Object.entries(WATCHED_CHANNELS).map(async ([id, name]) => {
          try {
            const data = await slackApi("conversations.history", { channel: id, limit: "3" });
            const msgs = (data.messages || []) as SlackMessage[];
            for (const m of msgs) {
              feed.push({
                channel: name,
                channelId: id,
                user: m.user || "unknown",
                userId: m.user || "",
                text: (m.text || "").slice(0, 300),
                ts: m.ts || "",
                replyCount: m.reply_count || 0,
              });
            }
          } catch { /* skip failed channels */ }
        })
      );

      // Sort by timestamp, newest first
      feed.sort((a, b) => parseFloat(b.ts) - parseFloat(a.ts));

      // Resolve user names
      const userIds = [...new Set(feed.map((f) => f.userId).filter(Boolean))];
      const users = await resolveUsers(userIds);

      const enrichedFeed = feed.slice(0, 20).map((f) => {
        const user = users.get(f.userId);
        return {
          ...f,
          user: user?.profile?.display_name || user?.real_name || user?.name || f.userId,
        };
      });

      return NextResponse.json({ feed: enrichedFeed, fetchedAt: new Date().toISOString() });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message, feed: [], channels: [] }, { status: 500 });
  }
}
