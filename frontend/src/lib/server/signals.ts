/**
 * Build a signal bundle for the Reputon contract's evaluate_and_update method.
 * The bundle is plain JSON the contract LLM understands — no schema enforcement
 * at the contract layer, so structure is purely descriptive.
 *
 * As of the connector migration, signals are sourced from the user's
 * connected accounts and wallet, not from typed input:
 *   - github: connected GitHub OAuth (handle, totals, recent PRs/repos)
 *   - protocols: Snapshot governance scan against the wallet
 *   - credentials: Gitcoin Passport scan against the wallet
 *
 * `notes` is still free-text. The legacy `governance`/`contributions`
 * input arrays remain on the type for back-compat but the analyzer no
 * longer asks the user to fill them in.
 */
import "server-only";
import { fetchGithubSignals, type GhSignals } from "./github";
import { githubHandle } from "./connections";
import { scanPassport, scanSnapshot, type PassportSummary, type SnapshotSummary } from "./scanners";

export type SignalInputs = {
  /** Legacy free-text handle. Ignored if the user has a connected GitHub. */
  github_handle?: string;
  governance?: {
    dao: string;
    role: "voter" | "author";
    quality_note?: string;
    proposal_ids?: string[];
  }[];
  contributions?: {
    source: "github" | "content" | "community" | "education" | "protocol";
    title: string;
    url?: string;
    summary?: string;
  }[];
  endorsements_count?: number;
  notes?: string;
};

export type SignalBundle = {
  address: string;
  generated_at: string;
  source: "reputon-analyzer";
  github: GhSignals | null;
  governance: NonNullable<SignalInputs["governance"]>;
  contributions: NonNullable<SignalInputs["contributions"]>;
  endorsements_count: number;
  notes?: string;
  /** Snapshot governance scan against the connected wallet. */
  protocols: SnapshotSummary | null;
  /** Gitcoin Passport summary against the connected wallet. */
  credentials: PassportSummary | null;
};

export async function buildBundle(
  address: string,
  inputs: SignalInputs,
  userId?: string
): Promise<SignalBundle> {
  // Prefer the OAuth-connected GitHub identity over a typed handle —
  // it's verified and we can call /user with the user's own token
  // (no anonymous rate limits).
  const connectedGh = userId ? await githubHandle(userId) : null;
  const handle = connectedGh?.login ?? inputs.github_handle;
  const github = handle ? await fetchGithubSignals(handle) : null;

  const [protocols, credentials] = await Promise.all([
    scanSnapshot(address),
    scanPassport(address),
  ]);

  return {
    address,
    generated_at: new Date().toISOString(),
    source: "reputon-analyzer",
    github,
    governance: inputs.governance ?? [],
    contributions: inputs.contributions ?? [],
    endorsements_count: inputs.endorsements_count ?? 0,
    notes: inputs.notes,
    protocols: protocols.ok ? protocols : null,
    credentials: credentials.ok ? credentials : null,
  };
}
