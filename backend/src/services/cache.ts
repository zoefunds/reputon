/**
 * Tiny JSON cache backed by Redis. Use for short-lived contract-read caching.
 */
import { redis } from "./redis";

const PREFIX = "cache:";

export async function getCached<T>(key: string): Promise<T | null> {
  const raw = await redis().get(PREFIX + key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setCached(
  key: string,
  value: unknown,
  ttlSec: number
): Promise<void> {
  await redis().set(PREFIX + key, JSON.stringify(value), "EX", ttlSec);
}

export async function invalidate(key: string): Promise<void> {
  await redis().del(PREFIX + key);
}

export async function memo<T>(
  key: string,
  ttlSec: number,
  loader: () => Promise<T>
): Promise<T> {
  const hit = await getCached<T>(key);
  if (hit !== null) return hit;
  const val = await loader();
  await setCached(key, val, ttlSec);
  return val;
}
