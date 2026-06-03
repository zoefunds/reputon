/**
 * One-shot: have the contract owner register a profile so we can then
 * run evaluate_and_update against it.
 *
 *   GENLAYER_ACCOUNT_PRIVATE_KEY=0x... \
 *   NEXT_PUBLIC_REPUTON_CONTRACT_ADDRESS=0xD7975... \
 *   NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api \
 *   npx tsx backend/scripts/register_owner_profile.ts
 */
import "../src/env";
import { writeReputon, reputon } from "../src/services/genlayer";

async function main() {
  const ownerAddress = "0x7401c129EDfc26E68FE19309fE461eb3Db1058Eb";

  console.log(`[register] checking existing profile for ${ownerAddress}…`);
  const has = await reputon.hasProfile(ownerAddress).catch(() => false);
  if (has) {
    console.log("[register] profile already exists, fetching score…");
    const score = await reputon.score(ownerAddress);
    console.log("[register] current score:", score);
    process.exit(0);
  }

  console.log("[register] registering owner profile…");
  const txHash = await writeReputon("register_profile", [
    "Reputon Protocol",
    "Deployer of the Reputon reputation, NFT, and sybil oracle contracts.",
  ]);
  console.log("[register] tx hash:", txHash);

  console.log("[register] polling for inclusion (up to 60s)…");
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const ok = await reputon.hasProfile(ownerAddress).catch(() => false);
    if (ok) {
      console.log("[register] profile registered on-chain ✓");
      const info = await reputon.contractInfo();
      console.log("[register] contract info:", info);
      process.exit(0);
    }
    process.stdout.write(".");
  }
  console.log("\n[register] timed out, but the tx may still settle. Re-run to check.");
}

main().catch((e) => {
  console.error("[register] failed:", e);
  process.exit(1);
});
