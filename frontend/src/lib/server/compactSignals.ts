/**
 * Compact a freeform signals object so the JSON-serialized form fits
 * under the on-chain MAX_SIGNALS_LEN cap (4000 chars) on reputon.py.
 *
 * Mirrors the helper in backend/src/services/jobs.ts. We keep two copies
 * because the user-signed write happens in the browser via the Vercel
 * Route Handler and can't import from the Fly-deployed backend.
 */

const MAX_ONCHAIN_SIGNALS = 4000;
const SAFE_BUDGET = 3500;

function clip(s: unknown, n: number): string {
  const str = typeof s === "string" ? s : s == null ? "" : String(s);
  return str.length > n ? str.slice(0, n) : str;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function compactSignalsJson(raw: Record<string, unknown>): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r: any = raw ?? {};
  const compact: Record<string, unknown> = {};

  if (typeof r.notes === "string" && r.notes.length > 0) compact.notes = clip(r.notes, 600);
  if (typeof r.source === "string") compact.source = clip(r.source, 60);
  if (typeof r.address === "string") compact.address = r.address;
  if (typeof r.generated_at === "string") compact.generated_at = r.generated_at;
  if (typeof r.endorsements_count === "number") compact.endorsements_count = r.endorsements_count;

  if (r.github && typeof r.github === "object") {
    const g = r.github;
    const gh: Record<string, unknown> = {};
    if (g.user && typeof g.user === "object") {
      gh.user = {
        login: clip(g.user.login, 60),
        followers: typeof g.user.followers === "number" ? g.user.followers : 0,
        public_repos: typeof g.user.public_repos === "number" ? g.user.public_repos : 0,
        created_at: clip(g.user.created_at, 40),
      };
    }
    if (g.totals && typeof g.totals === "object") {
      gh.totals = {
        stars: g.totals.stars ?? 0,
        pr_count: g.totals.pr_count ?? 0,
        merged_pr_count: g.totals.merged_pr_count ?? 0,
        repos_inspected: g.totals.repos_inspected ?? 0,
      };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (Array.isArray(g.recent_prs)) {
      gh.recent_prs = g.recent_prs.slice(0, 5).map((p: any) => ({
        title: clip(p?.title, 120),
        state: clip(p?.state, 16),
        merged: Boolean(p?.merged_at),
        repo: clip(p?.base?.repo?.full_name ?? p?.head?.repo?.full_name, 80),
      }));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (Array.isArray(g.recent_repos)) {
      gh.recent_repos = g.recent_repos.slice(0, 5).map((repo: any) => ({
        name: clip(repo?.full_name ?? repo?.name, 80),
        language: clip(repo?.language, 32),
        stars: typeof repo?.stargazers_count === "number" ? repo.stargazers_count : 0,
      }));
    }
    compact.github = gh;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (Array.isArray(r.governance)) {
    compact.governance = r.governance.slice(0, 12).map((g: any) => ({
      dao: clip(g?.dao, 80),
      role: clip(g?.role, 24),
    }));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (Array.isArray(r.contributions)) {
    compact.contributions = r.contributions.slice(0, 8).map((c: any) => ({
      source: clip(c?.source, 24),
      title: clip(c?.title, 120),
      url: clip(c?.url, 160),
    }));
  }

  // Wallet-scoped scans (Snapshot governance + Passport credentials).
  // These come from connector cards in the Analyzer; both are best-
  // effort so we only include them when they reported `ok`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p: any = r.protocols;
  if (p && typeof p === "object" && p.ok) {
    compact.protocols = {
      vote_count: typeof p.vote_count === "number" ? p.vote_count : 0,
      last_voted_at: typeof p.last_voted_at === "number" ? p.last_voted_at : null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      spaces: Array.isArray(p.spaces)
        ? p.spaces.slice(0, 6).map((s: any) => ({
            id: clip(s?.id, 40),
            name: clip(s?.name, 60),
            votes: typeof s?.votes === "number" ? s.votes : 0,
          }))
        : [],
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = r.credentials;
  if (c && typeof c === "object" && c.ok) {
    compact.credentials = {
      score: typeof c.score === "number" ? c.score : null,
      stamps: typeof c.stamps === "number" ? c.stamps : 0,
      passing: Boolean(c.passing),
    };
  }

  let json = JSON.stringify(compact);
  if (json.length <= SAFE_BUDGET) return json;

  // Shed in this order: legacy free-text contributions, then governance,
  // then GitHub long-tail, then heavy scanner fields, finally hard-cut.
  delete compact.contributions;
  json = JSON.stringify(compact);
  if (json.length <= SAFE_BUDGET) return json;

  delete compact.governance;
  json = JSON.stringify(compact);
  if (json.length <= SAFE_BUDGET) return json;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (compact.github as any)?.recent_repos;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (compact.github as any)?.recent_prs;
  json = JSON.stringify(compact);
  if (json.length <= SAFE_BUDGET) return json;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (compact.protocols as any)?.spaces;
  json = JSON.stringify(compact);
  if (json.length <= SAFE_BUDGET) return json;

  return json.slice(0, MAX_ONCHAIN_SIGNALS - 8) + '"}';
}
