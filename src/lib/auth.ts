import { NextRequest, NextResponse } from "next/server";

const AUTH_TOKEN = process.env.ATLAS_CONSOLE_TOKEN || "";

/**
 * Simple token auth for API routes.
 * If ATLAS_CONSOLE_TOKEN is not set, auth is disabled (local dev).
 * Token can be passed via Authorization header or ?token= query param.
 */
export function requireAuth(req: NextRequest): NextResponse | null {
  if (!AUTH_TOKEN) return null; // No token configured = auth disabled

  const header = req.headers.get("authorization");
  const queryToken = req.nextUrl.searchParams.get("token");

  const provided = header?.replace(/^Bearer\s+/i, "") || queryToken;

  if (provided === AUTH_TOKEN) return null; // Authorized

  return NextResponse.json(
    { error: "Unauthorized", message: "Set ATLAS_CONSOLE_TOKEN or pass ?token=" },
    { status: 401 }
  );
}
