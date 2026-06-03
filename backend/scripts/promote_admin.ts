/**
 * Promote a user to admin (or demote back to "user") by email.
 *
 *   npm --workspace backend run promote-admin -- you@example.com
 *   npm --workspace backend run promote-admin -- you@example.com --revoke
 *
 * Wallet-only accounts have no email — promote those by ID instead:
 *   npm --workspace backend run promote-admin -- --id <user-uuid>
 */
import "../src/env";
import { eq } from "drizzle-orm";
import { db, schema } from "../src/services/db";

async function main() {
  const argv = process.argv.slice(2);
  const revoke = argv.includes("--revoke");
  const idFlagIdx = argv.indexOf("--id");
  const id = idFlagIdx >= 0 ? argv[idFlagIdx + 1] : null;
  const email = argv.find((a) => a.includes("@") && !a.startsWith("--"));

  if (!email && !id) {
    console.error("usage: promote_admin <email> [--revoke]   |   promote_admin --id <uuid> [--revoke]");
    process.exit(2);
  }

  const target = id
    ? await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1)
    : await db.select().from(schema.users).where(eq(schema.users.email, email!)).limit(1);

  if (target.length === 0) {
    console.error("user not found");
    process.exit(1);
  }

  const role = revoke ? "user" : "admin";
  await db.update(schema.users).set({ role }).where(eq(schema.users.id, target[0].id));
  console.log(`[ok] ${target[0].email ?? target[0].id} → role=${role}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
