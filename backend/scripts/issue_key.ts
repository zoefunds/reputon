/**
 * One-shot: ensure a "Smoke Test User" exists and mint a fresh API key.
 * Prints the plaintext key on stdout (the only time it's revealed).
 *
 *   npx tsx backend/scripts/issue_key.ts
 */
import "../src/env";
import { eq } from "drizzle-orm";
import { db, schema } from "../src/services/db";
import { issue } from "../src/services/apiKeys";

async function main() {
  let [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, "smoke@reputon.local"))
    .limit(1);
  if (!user) {
    [user] = await db
      .insert(schema.users)
      .values({ name: "Smoke Test User", email: "smoke@reputon.local" })
      .returning();
  }
  const k = await issue({
    userId: user.id,
    name: "smoke",
    env: "test",
    scopes: ["*", "write:evaluate"],
  });
  console.log(k.key);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
