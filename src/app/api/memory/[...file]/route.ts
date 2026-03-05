import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join, normalize, resolve } from "path";

const WORKSPACE = process.env.OPENCLAW_WORKSPACE || "";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string[] }> }
) {
  const { file } = await params;
  const relativePath = file.join("/");

  // Sanitize: only allow .md files, no path traversal
  if (!relativePath.endsWith(".md")) {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }

  const memoryDir = resolve(join(WORKSPACE, "memory"));
  const targetPath = resolve(join(memoryDir, normalize(relativePath)));

  // Prevent path traversal
  if (!targetPath.startsWith(memoryDir)) {
    return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
  }

  try {
    const content = await readFile(targetPath, "utf-8");
    return NextResponse.json({ name: relativePath, content });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
