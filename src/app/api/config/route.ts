import { NextResponse } from "next/server";
import { readFile } from "fs/promises";

const CONFIG_PATH = process.env.OPENCLAW_CONFIG || "";

export async function GET() {
  try {
    const raw = await readFile(CONFIG_PATH, "utf-8");
    const config = JSON.parse(raw);

    // Redact sensitive tokens before sending to frontend
    const sanitized = JSON.parse(JSON.stringify(config));
    if (sanitized.channels) {
      for (const ch of Object.values(sanitized.channels) as Record<string, unknown>[]) {
        if (ch.token) ch.token = "***";
        if (ch.userToken) ch.userToken = "***";
      }
    }
    if (sanitized.gateway?.auth?.token) {
      sanitized.gateway.auth.token = "***";
    }

    return NextResponse.json(sanitized);
  } catch {
    return NextResponse.json({ error: "Could not read config" }, { status: 500 });
  }
}
