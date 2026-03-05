import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const exec = promisify(execFile);
const GH = "/opt/homebrew/bin/gh";

async function gh(args: string[], timeout = 15000): Promise<string> {
  const { stdout } = await exec(GH, args, { timeout });
  return stdout.trim();
}

interface SearchPR {
  title: string;
  state: string;
  url: string;
  createdAt?: string;
  updatedAt?: string;
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

interface CheckLine {
  name: string;
  status: string; // pass, fail, skipping, pending
  duration: string;
  url: string;
}

function parseChecksOutput(output: string): CheckLine[] {
  return output
    .split("\n")
    .filter((l) => l.trim())
    .map((line) => {
      const parts = line.split("\t");
      return {
        name: parts[0]?.trim() || "",
        status: parts[1]?.trim() || "unknown",
        duration: parts[2]?.trim() || "",
        url: parts[3]?.trim() || "",
      };
    });
}

async function fetchChecksForPR(repo: string, prNumber: number): Promise<{
  checks: CheckLine[];
  passing: number;
  failing: number;
  pending: number;
}> {
  try {
    const output = await gh(["pr", "checks", String(prNumber), "--repo", repo]);
    const checks = parseChecksOutput(output);
    return {
      checks,
      passing: checks.filter((c) => c.status === "pass").length,
      failing: checks.filter((c) => c.status === "fail").length,
      pending: checks.filter((c) => c.status === "pending" || c.status === "skipping").length,
    };
  } catch {
    return { checks: [], passing: 0, failing: 0, pending: 0 };
  }
}

export async function GET() {
  try {
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

    let prs: SearchPR[] = [];
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

    // Fetch CI checks for open PRs (only first 3 to avoid rate limits)
    const openPrs = prs.filter((p) => p.state?.toLowerCase() === "open");
    const checksMap: Record<string, { checks: CheckLine[]; passing: number; failing: number; pending: number }> = {};

    const checksPromises = openPrs.slice(0, 3).map(async (pr) => {
      const repo = pr.repository?.nameWithOwner;
      if (!repo || !pr.url) return;
      const prNumber = parseInt(pr.url.split("/").pop() || "0");
      if (!prNumber) return;
      const result = await fetchChecksForPR(repo, prNumber);
      checksMap[pr.url] = result;
    });

    await Promise.allSettled(checksPromises);

    return NextResponse.json({
      user,
      authenticated: true,
      prs: prs.map((p) => {
        const ci = checksMap[p.url];
        return {
          title: p.title,
          state: p.state?.toLowerCase(),
          url: p.url,
          repo: p.repository?.nameWithOwner || "unknown",
          repoName: p.repository?.name || "unknown",
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          ci: ci
            ? {
                passing: ci.passing,
                failing: ci.failing,
                pending: ci.pending,
                failedChecks: ci.checks
                  .filter((c) => c.status === "fail")
                  .map((c) => ({ name: c.name, url: c.url, duration: c.duration })),
              }
            : undefined,
        };
      }),
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
