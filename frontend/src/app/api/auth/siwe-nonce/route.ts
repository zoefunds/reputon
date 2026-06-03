import { NextResponse } from "next/server";
import { generateNonce } from "siwe";

export const dynamic = "force-dynamic";

/** Returns a fresh nonce the client embeds in the SIWE message. */
export async function GET() {
 const nonce = generateNonce();
 // Auth.js's Credentials provider re-verifies the nonce against the SIWE
 // message itself, so we don't need server-side storage here.
 return NextResponse.json({ nonce });
}
