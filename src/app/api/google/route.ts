import { NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";

const TOKENS_PATH = process.env.GOOGLE_TOKENS_PATH || "/root/.config/gogcli/google_tokens.json";
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

interface Tokens {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  token_type?: string;
}

async function getTokens(): Promise<Tokens> {
  const raw = await readFile(TOKENS_PATH, "utf-8");
  return JSON.parse(raw);
}

async function refreshAccessToken(tokens: Tokens): Promise<Tokens> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: tokens.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);

  const updated = { ...tokens, access_token: data.access_token, expires_in: data.expires_in };
  await writeFile(TOKENS_PATH, JSON.stringify(updated, null, 2));
  return updated;
}

async function googleApi(url: string, tokens: Tokens): Promise<Record<string, unknown>> {
  let res = await fetch(url, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  // Auto-refresh on 401
  if (res.status === 401) {
    const refreshed = await refreshAccessToken(tokens);
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${refreshed.access_token}` },
    });
  }

  return res.json();
}

interface CalendarEvent {
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  htmlLink?: string;
  attendees?: { email: string; displayName?: string; responseStatus?: string }[];
  hangoutLink?: string;
  location?: string;
}

interface GmailThread {
  id: string;
  snippet?: string;
  messages?: { id: string; payload?: { headers?: { name: string; value: string }[] }; internalDate?: string }[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "overview";

  try {
    const tokens = await getTokens();

    if (action === "calendar") {
      const now = new Date().toISOString();
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString();
      const data = await googleApi(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=15&timeMin=${now}&timeMax=${nextWeek}&orderBy=startTime&singleEvents=true`,
        tokens
      ) as { items?: CalendarEvent[] };

      const events = (data.items || []).map((e) => ({
        summary: e.summary || "(No title)",
        start: e.start?.dateTime || e.start?.date || "",
        end: e.end?.dateTime || e.end?.date || "",
        link: e.htmlLink || "",
        meetLink: e.hangoutLink || "",
        location: e.location || "",
        attendees: (e.attendees || []).length,
      }));

      return NextResponse.json({ events, fetchedAt: new Date().toISOString() });
    }

    if (action === "gmail") {
      const limit = searchParams.get("limit") || "10";
      const query = searchParams.get("q") || "is:inbox newer_than:3d";

      // Get message list
      const listData = await googleApi(
        `https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=${limit}&q=${encodeURIComponent(query)}`,
        tokens
      ) as { messages?: { id: string }[] };

      const messageIds = (listData.messages || []).slice(0, 8);

      // Fetch individual messages (headers only for speed)
      const messages = await Promise.all(
        messageIds.map(async (m) => {
          const msg = await googleApi(
            `https://www.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
            tokens
          ) as { id: string; snippet?: string; internalDate?: string; payload?: { headers?: { name: string; value: string }[] }; labelIds?: string[] };

          const headers = msg.payload?.headers || [];
          const getHeader = (name: string) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

          return {
            id: msg.id,
            subject: getHeader("Subject"),
            from: getHeader("From").replace(/<[^>]+>/, "").trim(),
            date: getHeader("Date"),
            snippet: msg.snippet || "",
            isUnread: (msg.labelIds || []).includes("UNREAD"),
          };
        })
      );

      return NextResponse.json({ messages, fetchedAt: new Date().toISOString() });
    }

    if (action === "drive") {
      const data = await googleApi(
        "https://www.googleapis.com/drive/v3/files?pageSize=10&orderBy=modifiedTime desc&fields=files(id,name,modifiedTime,mimeType,webViewLink)",
        tokens
      ) as { files?: { id: string; name: string; modifiedTime: string; mimeType: string; webViewLink?: string }[] };

      const files = (data.files || []).map((f) => ({
        id: f.id,
        name: f.name,
        modifiedTime: f.modifiedTime,
        type: f.mimeType.split(".").pop() || f.mimeType,
        link: f.webViewLink || "",
      }));

      return NextResponse.json({ files, fetchedAt: new Date().toISOString() });
    }

    if (action === "overview") {
      // Quick overview: next 3 events + 3 recent emails
      const now = new Date().toISOString();
      const tomorrow = new Date(Date.now() + 2 * 86400000).toISOString();

      const [calData, gmailData] = await Promise.all([
        googleApi(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=3&timeMin=${now}&timeMax=${tomorrow}&orderBy=startTime&singleEvents=true`,
          tokens
        ) as Promise<{ items?: CalendarEvent[] }>,
        googleApi(
          "https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=3&q=is:inbox is:unread",
          tokens
        ) as Promise<{ messages?: { id: string }[]; resultSizeEstimate?: number }>,
      ]);

      const events = (calData.items || []).map((e) => ({
        summary: e.summary || "(No title)",
        start: e.start?.dateTime || e.start?.date || "",
        meetLink: e.hangoutLink || "",
        attendees: (e.attendees || []).length,
      }));

      return NextResponse.json({
        calendar: { events, count: events.length },
        gmail: { unreadCount: gmailData.resultSizeEstimate || (gmailData.messages || []).length },
        fetchedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
