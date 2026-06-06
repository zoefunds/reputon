import { Hono } from "hono";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { reputonNft, isContractConfigured } from "../services/genlayer";

const app = new Hono();

const AddressQ = z.object({ address: z.string().min(4).max(64) });
const TierQ = z.object({ tier: z.string().min(1).max(40) });

function guard() {
  if (!isContractConfigured("nft")) {
    throw new HTTPException(503, {
      message: "NFT contract address not set.",
    });
  }
}

app.get("/info", async (c) => {
  guard();
  return c.json(await reputonNft.contractInfo());
});

app.get("/supply", async (c) => {
  guard();
  return c.json({ total_supply: await reputonNft.totalSupply() });
});

app.get("/credential/:tokenId", async (c) => {
  guard();
  const tokenId = Number(c.req.param("tokenId"));
  if (!Number.isInteger(tokenId) || tokenId < 1) {
    throw new HTTPException(400, { message: "Invalid token id" });
  }
  try {
    return c.json(await reputonNft.credential(tokenId));
  } catch (e) {
    // The contract throws Exception("token not found") for missing ids,
    // genlayer-js wraps that in a multi-line viem string. Don't leak
    // either to the response body — return a clean JSON 404.
    const raw = (e as Error).message ?? "";
    const isMissing = /token not found|execution failed|profile not found/i.test(raw);
    return c.json(
      {
        error: {
          message: isMissing ? "token not found" : "failed to read credential",
          code: 404,
        },
      },
      404
    );
  }
});

app.get("/of", async (c) => {
  guard();
  const parsed = AddressQ.safeParse({ address: c.req.query("address") });
  if (!parsed.success) throw new HTTPException(400, { message: "Invalid address" });
  return c.json({
    credentials: await reputonNft.credentialsOf(parsed.data.address),
  });
});

app.get("/has", async (c) => {
  guard();
  const parsed = AddressQ.merge(TierQ).safeParse({
    address: c.req.query("address"),
    tier: c.req.query("tier"),
  });
  if (!parsed.success) throw new HTTPException(400, { message: "Invalid params" });
  return c.json({
    address: parsed.data.address,
    tier: parsed.data.tier,
    has: await reputonNft.hasCredential(parsed.data.address, parsed.data.tier),
  });
});

app.get("/self-mint-allowed/:tier", async (c) => {
  guard();
  const tier = c.req.param("tier");
  return c.json({ tier, allowed: await reputonNft.isSelfMintAllowed(tier) });
});

app.get("/minter/:address", async (c) => {
  guard();
  const address = c.req.param("address");
  return c.json({ address, authorized: await reputonNft.isAuthorizedMinter(address) });
});

export default app;
