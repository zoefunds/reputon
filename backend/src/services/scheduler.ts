/**
 * Lightweight in-process scheduler. Started once when the Hono server boots.
 *
 *   - every 5s   :  process evaluation jobs (batch)
 *   - every 10s  :  process webhook retries
 *   - every 60s  :  sweep stale running jobs
 */

import { processQueue, sweepStaleJobs } from "./jobs";
import { processRetries } from "./webhooks";

let started = false;

export function startScheduler(): void {
  if (started) return;
  started = true;

  schedule("jobs.processQueue", 5_000, () => processQueue(5));
  schedule("webhooks.processRetries", 10_000, () => processRetries());
  schedule("jobs.sweepStale", 60_000, () => sweepStaleJobs());
}

function schedule(name: string, intervalMs: number, run: () => Promise<unknown>) {
  const tick = async () => {
    try {
      await run();
    } catch (e) {
      console.error(`[scheduler:${name}]`, (e as Error).message);
    } finally {
      setTimeout(tick, intervalMs).unref();
    }
  };
  setTimeout(tick, intervalMs).unref();
}
