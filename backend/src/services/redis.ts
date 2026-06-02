import Redis from "ioredis";
import { env } from "../env";

let _redis: Redis | null = null;

export function redis(): Redis {
  if (_redis) return _redis;
  _redis = new Redis(env().REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: false,
  });
  _redis.on("error", (e) => console.error("[redis]", e.message));
  return _redis;
}

export async function closeRedis() {
  if (_redis) {
    await _redis.quit();
    _redis = null;
  }
}
