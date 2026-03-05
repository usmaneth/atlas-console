import { NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import { join, relative } from "path";

const WORKSPACE = process.env.OPENCLAW_WORKSPACE || "";

async function walkDir(dir: string, base: string): Promise<{ name: string; size: number; modified: string }[]> {
  const results: { name: string; size: number; modified: string }[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = await walkDir(fullPath, base);
      results.push(...sub);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      const info = await stat(fullPath).catch(() => null);
      results.push({
        name: relative(base, fullPath),
        size: info?.size ?? 0,
        modified: info?.mtime?.toISOString() ?? "",
      });
    }
  }
  return results;
}

export async function GET() {
  const memoryDir = join(WORKSPACE, "memory");
  try {
    const files = await walkDir(memoryDir, memoryDir);
    files.sort((a, b) => b.modified.localeCompare(a.modified));
    return NextResponse.json({ files });
  } catch {
    return NextResponse.json({ files: [], error: "Could not read memory directory" }, { status: 500 });
  }
}
