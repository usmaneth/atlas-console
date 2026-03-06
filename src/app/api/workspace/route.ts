import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

const WORKSPACE = process.env.OPENCLAW_WORKSPACE || "";

const WORKSPACE_FILES = [
  "MEMORY.md",
  "SOUL.md",
  "IDENTITY.md",
  "USER.md",
  "AGENTS.md",
  "HEARTBEAT.md",
  "TOOLS.md",
];

export async function GET() {
  const results: Record<string, string | null> = {};

  await Promise.all(
    WORKSPACE_FILES.map(async (name) => {
      try {
        results[name] = await readFile(join(WORKSPACE, name), "utf-8");
      } catch {
        results[name] = null;
      }
    })
  );

  return NextResponse.json(results);
}
