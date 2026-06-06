/**
 * NFT tier constants. Kept in a plain TS file (no "use client") so server
 * components can import them without dragging in the wagmi-based hooks
 * from TierGrid.tsx.
 */

export type TierDef = {
  id: "genesis" | "bronze" | "silver" | "gold" | "eternal";
  label: string;
  threshold: number;
  gradient: string;
  blurb: string;
  defaultName: string;
  defaultDescription: string;
};

export const TIERS: TierDef[] = [
  {
    id: "genesis",
    label: "Genesis",
    threshold: 0,
    gradient: "from-amber-200 to-amber-500",
    blurb: "Founding-member soulbound proof. Free to claim, your only Genesis ever.",
    defaultName: "Reputon Genesis",
    defaultDescription: "Early member of the Reputon reputation protocol.",
  },
  {
    id: "bronze",
    label: "Bronze",
    threshold: 250,
    gradient: "from-orange-300 to-orange-600",
    blurb: "Verified contributor with consistent on-chain activity.",
    defaultName: "Reputon Bronze",
    defaultDescription: "Bronze-tier reputation credential.",
  },
  {
    id: "silver",
    label: "Silver",
    threshold: 500,
    gradient: "from-gray-200 to-gray-500",
    blurb: "Trusted operator. Real governance footprint and credible identity.",
    defaultName: "Reputon Silver",
    defaultDescription: "Silver-tier reputation credential.",
  },
  {
    id: "gold",
    label: "Gold",
    threshold: 750,
    gradient: "from-yellow-200 to-yellow-500",
    blurb: "Eminent contributor across protocols, governance and credentials.",
    defaultName: "Reputon Gold",
    defaultDescription: "Gold-tier reputation credential.",
  },
  {
    id: "eternal",
    label: "Eternal",
    threshold: 950,
    gradient: "from-indigo-300 to-indigo-600",
    blurb: "Top-of-protocol. Reserved for wallets at the ceiling of the score.",
    defaultName: "Reputon Eternal",
    defaultDescription: "Eternal-tier reputation credential.",
  },
];
