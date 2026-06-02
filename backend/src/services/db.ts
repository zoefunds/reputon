import { getDb, getSql, closeDb } from "@reputon/db/client";
import * as schema from "@reputon/db/schema";
import { env } from "../env";

export const db = getDb(env().DATABASE_URL);
export const sql = getSql(env().DATABASE_URL);
export { schema, closeDb };
