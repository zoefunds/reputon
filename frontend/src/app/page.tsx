import { Hero } from "@/components/landing/Hero";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { CTA } from "@/components/landing/CTA";
import { getProtocolStats } from "@/lib/server/stats";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const stats = await getProtocolStats();
  return (
    <>
      <Hero />
      <TrustStrip />
      <FeatureGrid />
      <HowItWorks />
      <CTA stats={stats} />
    </>
  );
}
