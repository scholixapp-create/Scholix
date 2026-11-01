import HomeNav from "@/components/home/HomeNav";
import Hero from "@/components/home/Hero";
import CommissionSection from "@/components/home/CommissionSection";
import HowItWorks from "@/components/home/HowItWorks";
import Toolkit from "@/components/home/Toolkit";
import { ClosingCTA, HomeFooter } from "@/components/home/ClosingCTA";

export default function Home() {
  return (
    <div className="min-h-[100dvh] bg-brand-cream">
      <HomeNav />
      <main>
        <Hero />
        <CommissionSection />
        <HowItWorks />
        <Toolkit />
        <ClosingCTA />
      </main>
      <HomeFooter />
    </div>
  );
}
