import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const exec = promisify(execFile);
const GH = "/opt/homebrew/bin/gh";

async function gh(args: string[], timeout = 10000): Promise<string> {
  const { stdout } = await exec(GH, args, { timeout });
  return stdout.trim();
}

async function ghJson<T>(args: string[]): Promise<T> {
  const raw = await gh(args);
  return JSON.parse(raw) as T;
}

interface PR {
  title: string;
  state: string;
  url: string;
  createdAt: string;
  updatedAt?: string;
  headRefName: string;
  repository?: { name: string; nameWithOwner: string };
}

interface Commit {
  sha: string;
  commit: {
    message: string;
    author: { date: string; name: string };
  };
  html_url: string;
}

interface Repo {
  name: string;
  pushedAt: string;
  defaultBranchRef: { name: string };
  description?: string;
  isPrivate?: boolean;
  url?: string;
}

export async function GET() {
  try {
    // Run all queries in parallel
    const [userRaw, prsRaw, reposRaw, commitsRaw] = await Promise.allSettled([
      gh(["api", "user", "--jq", ".login"]),
      gh([
        "search", "prs", "--author=@me", "--limit", "10",
        "--json", "title,state,repository,updatedAt,url,createdAt",
      ]),
      gh([
        "repo", "list", "--limit", "8",
        "--json", "name,pushedAt,defaultBranchRef,description,isPrivate,url",
      ]),
      gh([
        "api", "repos/usmaneth/atlas-console/commits",
        "--jq", ".[0:10]",
      ]),
    ]);

    const user = userRaw.status === "fulfilled" ? userRaw.value : "unknown";

    let prs: PR[] = [];
    if (prsRaw.status === "fulfilled") {
      try { prs = JSON.parse(prsRaw.value); } catch { /* empty */ }
    }

    let repos: Repo[] = [];
    if (reposRaw.status === "fulfilled") {
      try { repos = JSON.parse(reposRaw.value); } catch { /* empty */ }
    }

    let commits: { sha: string; message: string; date: string; url: string; author: string }[] = [];
    if (commitsRaw.status === "fulfilled") {
      try {
        const raw = JSON.parse(commitsRaw.value) as Commit[];
        commits = raw.map((c) => ({
          sha: c.sha.slice(0, 7),
          message: c.commit.message.split("\n")[0].slice(0, 120),
          date: c.commit.author.date,
          url: c.html_url,
          author: c.commit.author.name,
        }));
      } catch { /* empty */ }
    }

    return NextResponse.json({
      user,
      authenticated: true,
      prs: prs.map((p) => ({
        title: p.title,
        state: p.state?.toLowerCase(),
        url: p.url,
        repo: p.repository?.nameWithOwner || "unknown",
        repoName: p.repository?.name || "unknown",
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      repos: repos.map((r) => ({
        name: r.name,
        pushedAt: r.pushedAt,
        defaultBranch: r.defaultBranchRef?.name || "main",
        description: r.description || null,
        isPrivate: r.isPrivate ?? false,
        url: r.url || null,
      })),
      commits,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { authenticated: false, error: message, prs: [], repos: [], commits: [] },
      { status: 500 }
    );
  }
}
