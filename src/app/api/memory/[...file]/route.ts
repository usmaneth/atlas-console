import { NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join, normalize, resolve, dirname } from "path";

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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ file: string[] }> }
) {
  const { file } = await params;
  const relativePath = file.join("/");

  if (!relativePath.endsWith(".md")) {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }

  const memoryDir = resolve(join(WORKSPACE, "memory"));
  const targetPath = resolve(join(memoryDir, normalize(relativePath)));

  if (!targetPath.startsWith(memoryDir)) {
    return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const content = body.content;
    if (typeof content !== "string") {
      return NextResponse.json({ error: "Content must be a string" }, { status: 400 });
    }
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, content, "utf-8");
    return NextResponse.json({ name: relativePath, saved: true });
  } catch {
    return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
  }
}
