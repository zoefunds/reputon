/**
 * Lightweight GitHub fetcher used by the analyzer.
 * Uses the unauthenticated REST API by default (60 req/hr per IP);
 * a GITHUB_TOKEN in env raises the limit to 5000/hr.
 */
import "server-only";

const BASE = "https://api.github.com";
const TOKEN = process.env.GITHUB_TOKEN;

async function gh<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(BASE + path, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
        "User-Agent": "Reputon-Analyzer/1.0",
      },
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export type GhUser = {
  login: string;
  name: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
};

export type GhRepoStats = {
  full_name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  pushed_at: string;
  language: string | null;
  default_branch: string;
};

export type GhRecentPR = {
  number: number;
  title: string;
  state: string;
  merged_at: string | null;
  created_at: string;
  user: { login: string } | null;
  url: string;
};

export type GhSignals = {
  user: GhUser | null;
  recent_repos: GhRepoStats[];
  recent_prs: GhRecentPR[];
  totals: {
    repos_inspected: number;
    pr_count: number;
    merged_pr_count: number;
    stars: number;
  };
};

export async function fetchGithubSignals(login: string): Promise<GhSignals> {
  const handle = login.replace(/^@/, "").trim();
  if (!handle || handle.length > 39) {
    return {
      user: null,
      recent_repos: [],
      recent_prs: [],
      totals: { repos_inspected: 0, pr_count: 0, merged_pr_count: 0, stars: 0 },
    };
  }

  const [user, repos] = await Promise.all([
    gh<GhUser>(`/users/${encodeURIComponent(handle)}`),
    gh<GhRepoStats[]>(`/users/${encodeURIComponent(handle)}/repos?per_page=10&sort=pushed`),
  ]);

  const top = (repos ?? []).slice(0, 5);
  const prLists = await Promise.all(
    top.map((r) =>
      gh<GhRecentPR[]>(
        `/repos/${r.full_name}/pulls?state=all&per_page=5&sort=created&direction=desc`
      ).then((list) => list ?? [])
    )
  );
  const prs = prLists.flat().slice(0, 15);

  return {
    user,
    recent_repos: top,
    recent_prs: prs,
    totals: {
      repos_inspected: top.length,
      pr_count: prs.length,
      merged_pr_count: prs.filter((p) => p.merged_at).length,
      stars: top.reduce((s, r) => s + (r.stargazers_count ?? 0), 0),
    },
  };
}
