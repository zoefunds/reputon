import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let _client: postgres.Sql | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getSql(url?: string) {
  if (_client) return _client;
  const connStr = url ?? process.env.DATABASE_URL;
  if (!connStr) {
    throw new Error("DATABASE_URL is not set");
  }
  _client = postgres(connStr, {
    max: 10,
    idle_timeout: 30,
    onnotice: () => {},
  });
  return _client;
}

export function getDb(url?: string) {
  if (_db) return _db;
  const sql = getSql(url);
  _db = drizzle(sql, { schema });
  return _db;
}

export async function closeDb() {
  if (_client) {
    await _client.end({ timeout: 5 });
    _client = null;
    _db = null;
  }
}

export type Database = ReturnType<typeof getDb>;
