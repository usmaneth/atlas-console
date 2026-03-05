import { NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import { join } from "path";

const WORKSPACE = process.env.OPENCLAW_WORKSPACE || "";

export async function GET() {
  const memoryDir = join(WORKSPACE, "memory");
  try {
    const entries = await readdir(memoryDir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".md")) {
        const info = await stat(join(memoryDir, entry.name)).catch(() => null);
        files.push({
          name: entry.name,
          size: info?.size ?? 0,
          modified: info?.mtime?.toISOString() ?? "",
        });
      }
    }
    files.sort((a, b) => b.modified.localeCompare(a.modified));
    return NextResponse.json({ files });
  } catch {
    return NextResponse.json({ files: [], error: "Could not read memory directory" }, { status: 500 });
  }
}
