/**
 * Server-only Genlayer client wrapper for the frontend.
 * Used by Route Handlers that need to issue on-chain reads/writes themselves
 * (e.g. minting NFT credentials) rather than going through the backend.
 */
import "server-only";
import { createClient, createAccount, abi } from "genlayer-js";
import { studionet, testnetAsimov, localnet } from "genlayer-js/chains";

type Hex = `0x${string}`;

// genlayer-js encodes plain hex strings as TYPE_STR, not Address — so any
// contract method whose param is typed `Address` reverts with
// "execution failed". CalldataAddress isn't on the public surface, but the
// decoder uses it; round-trip a SPECIAL_ADDR sentinel to grab the class.
const _SPECIAL_ADDR = 24; // (3 << 3) | TYPE_SPECIAL
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _probe = (abi as any).calldata.decode(
  new Uint8Array([_SPECIAL_ADDR, ...new Array(20).fill(0)])
);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CalldataAddressCtor: any = _probe?.constructor;

function _hexToBytes20(hex: string): Uint8Array {
  const h = (hex.startsWith("0x") ? hex.slice(2) : hex).padStart(40, "0");
  if (h.length !== 40) throw new Error(`bad address length: ${hex}`);
  const out = new Uint8Array(20);
  for (let i = 0; i < 20; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function addr(value: string | unknown): unknown {
  if (value && typeof value === "object" && CalldataAddressCtor && value instanceof CalldataAddressCtor) return value;
  if (typeof value !== "string") throw new Error(`addr() expected hex string, got ${typeof value}`);
  if (!CalldataAddressCtor) return value;
  return new CalldataAddressCtor(_hexToBytes20(value));
}

const ADDR = {
  reputon: (process.env.NEXT_PUBLIC_REPUTON_CONTRACT_ADDRESS ?? "") as Hex,
  nft: (process.env.NEXT_PUBLIC_REPUTON_NFT_CONTRACT_ADDRESS ?? "") as Hex,
  sybil: (process.env.NEXT_PUBLIC_SYBIL_ORACLE_CONTRACT_ADDRESS ?? "") as Hex,
};

function chainFor(rpc: string) {
  if (rpc.includes("studio.genlayer.com")) return studionet;
  if (rpc.includes("asimov")) return testnetAsimov;
  return localnet;
}

let _client: ReturnType<typeof createClient> | null = null;
function client() {
  if (_client) return _client;
  const rpc = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL ?? "https://studio.genlayer.com/api";
  const pk = process.env.GENLAYER_ACCOUNT_PRIVATE_KEY as Hex | undefined;
  const account = pk ? createAccount(pk) : createAccount();
  _client = createClient({ chain: chainFor(rpc), account, endpoint: rpc });
  return _client;
}

export function hasSigner() {
  return Boolean(process.env.GENLAYER_ACCOUNT_PRIVATE_KEY);
}

export function nftAddress(): Hex {
  if (!ADDR.nft) throw new Error("NEXT_PUBLIC_REPUTON_NFT_CONTRACT_ADDRESS not set");
  return ADDR.nft;
}

export async function writeNft(method: string, args: unknown[]): Promise<string> {
  if (!hasSigner()) throw new Error("no on-chain signer configured");
  const c = client() as unknown as Record<string, (i: unknown) => Promise<unknown>>;
  const input = { address: nftAddress(), functionName: method, args };
  if (typeof c.writeContract === "function") {
    const out = (await c.writeContract(input)) as string | { hash?: string; transactionHash?: string };
    if (typeof out === "string") return out;
    return out?.hash ?? out?.transactionHash ?? "";
  }
  if (typeof c.write === "function") {
    const out = (await c.write({ to: nftAddress(), method, args })) as string | { hash?: string };
    if (typeof out === "string") return out;
    return out?.hash ?? "";
  }
  throw new Error("genlayer-js exposes neither writeContract() nor write()");
}
