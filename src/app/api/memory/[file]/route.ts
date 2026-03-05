import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join, basename } from "path";

const WORKSPACE = process.env.OPENCLAW_WORKSPACE || "";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params;
  // Sanitize: only allow .md files, no path traversal
  const safe = basename(file);
  if (!safe.endsWith(".md") || safe.includes("..")) {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }
  try {
    const content = await readFile(join(WORKSPACE, "memory", safe), "utf-8");
    return NextResponse.json({ name: safe, content });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
