import { ImageResponse } from "next/og";
import { onchain } from "@/lib/server/onchain";

export const runtime = "nodejs";
export const alt = "Reputon profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CATEGORY_TINT: Record<string, string> = {
  unverified: "#6b7280",
  emerging: "#f59e0b",
  trusted: "#1f2937",
  eminent: "#10b981",
};

export default async function ProfileOgImage({
  params,
}: {
  params: { address: string };
}) {
  const { address } = params;
  const [profile, score] = await Promise.all([
    onchain.profile(address),
    onchain.score(address),
  ]);
  const display = profile?.display_name || short(address);
  const value = score?.score ?? null;
  const category = score?.category ?? "unverified";
  const tint = CATEGORY_TINT[category] ?? CATEGORY_TINT.unverified;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#efece4",
          fontFamily: "Inter, system-ui, sans-serif",
          padding: 64,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "#1f2937",
              color: "#efece4",
              fontSize: 22,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            R
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, color: "#111" }}>Reputon</div>
          <div
            style={{
              marginLeft: "auto",
              fontSize: 14,
              color: "#6b7280",
              letterSpacing: 2,
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            On-chain reputation
          </div>
        </div>

        {/* Body */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 48, fontWeight: 600, color: "#111", letterSpacing: -2, display: "flex" }}>
            {display}
          </div>
          <div style={{ fontSize: 22, color: "#6b7280", fontFamily: "monospace", display: "flex" }}>
            {address}
          </div>
        </div>

        {/* Score bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            padding: 28,
            background: "#ffffff",
            border: "1px solid #d6d2c4",
            borderRadius: 18,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 14, color: "#6b7280", letterSpacing: 2, textTransform: "uppercase", display: "flex" }}>
              Reputation score
            </div>
            <div style={{ fontSize: 96, fontWeight: 600, color: "#111", lineHeight: 1, marginTop: 4, display: "flex" }}>
              {value ?? "—"}
              <span style={{ fontSize: 22, color: "#6b7280", marginLeft: 8, alignSelf: "flex-end" }}>
                / 1000
              </span>
            </div>
          </div>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              borderRadius: 999,
              background: tint,
              color: "#fff",
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            {category}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

function short(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
