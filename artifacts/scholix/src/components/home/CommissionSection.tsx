import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Info, UserPlus, Sparkle } from "lucide-react";
import { BrandStar } from "@/components/Brand";
import { Eyebrow, Reveal, EASE } from "./shared";

const tiers = [
  { name: "Starter", range: "0–9", fee: 30, keep: 70 },
  { name: "Growth", range: "10–24", fee: 24, keep: 76 },
  { name: "Established", range: "25–49", fee: 15, keep: 85 },
  { name: "Expert", range: "50+", fee: 5, keep: 95 },
];

export default function CommissionSection() {
  const reduce = useReducedMotion();
  return (
    <section id="commission" className="relative overflow-hidden bg-brand-navy text-brand-cream scroll-mt-28">
      <BrandStar size={420} className="absolute -right-32 -top-24 opacity-[0.06] sx-spin-slow pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-16 lg:py-20">
        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-10 lg:gap-14 items-start">
          {/* The headline offer */}
          <Reveal>
            <Eyebrow light>The first-pairing offer</Eyebrow>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl font-semibold leading-[1.05]">
              Your first student pairing pays{" "}
              <span className="text-brand-gold italic">0%</span> platform commission. Ongoing.
            </h2>
            <p className="mt-4 text-brand-cream/70 leading-relaxed max-w-lg">
              Your first completed tutoring session establishes your first student pairing. That pairing stays free of Scholix platform commission for as long as you keep teaching them.
            </p>

            <div className="mt-7 grid sm:grid-cols-2 gap-3">
              <div className="rounded-2xl bg-brand-gold text-brand-navy p-5">
                <UserPlus size={20} strokeWidth={1.75} aria-hidden="true" />
                <p className="mt-3 font-display text-3xl font-semibold leading-none">0%</p>
                <p className="mt-2 text-sm font-semibold">First student pairing</p>
                <p className="text-xs text-brand-navy/70 mt-1">Platform commission, every completed session, ongoing.</p>
              </div>
              <div className="rounded-2xl border border-brand-cream/20 bg-brand-cream/5 p-5">
                <Sparkle size={20} strokeWidth={1.75} className="text-brand-gold" aria-hidden="true" />
                <p className="mt-3 font-display text-3xl font-semibold leading-none">0%</p>
                <p className="mt-2 text-sm font-semibold">First session with each new student</p>
                <p className="text-xs text-brand-cream/60 mt-1">Your first completed session with every new student carries no platform commission.</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-brand-cream/55 leading-relaxed max-w-lg">
              These are Scholix platform commission waivers for tutors. Lessons are not free for families, and other fees or taxes may still apply.
            </p>
          </Reveal>

          {/* The ladder */}
          <Reveal delay={0.1}>
            <div className="rounded-3xl bg-brand-cream text-brand-navy p-5 sm:p-7 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)]">
              <div className="flex items-baseline justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-teal">Commission tiers</p>
                  <h3 className="mt-1 font-display text-2xl font-semibold">Keep more as you teach more</h3>
                </div>
                <p className="text-xs text-brand-navy/60">Platform fee by commission-paying sessions completed</p>
              </div>

              <ol className="mt-6 space-y-2.5" aria-label="Commission tiers">
                {tiers.map((t, i) => (
                  <li key={t.name} className="grid grid-cols-[5.5rem_1fr_auto] sm:grid-cols-[7rem_1fr_auto] items-center gap-3">
                    <div>
                      <p className="text-sm font-bold">{t.name}</p>
                      <p className="text-[11px] text-brand-navy/55">{t.range} sessions</p>
                    </div>
                    <div className="h-9 rounded-full bg-brand-navy/[0.07] overflow-hidden relative" aria-hidden="true">
                      <motion.div
                        className={`h-full rounded-full origin-left ${i === tiers.length - 1 ? "bg-brand-teal" : "bg-brand-navy"}`}
                        style={{ width: `${t.keep}%` }}
                        initial={reduce ? false : { scaleX: 0.9 }}
                        whileInView={{ scaleX: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, delay: 0.15 + i * 0.12, ease: EASE }}
                      />
                      <span className="absolute inset-y-0 left-3 flex items-center text-[11px] font-semibold text-brand-cream">You keep {t.keep}%</span>
                    </div>
                    <p className="font-display text-2xl font-semibold w-14 text-right tabular-nums">{t.fee}%</p>
                  </li>
                ))}
              </ol>

              <div className="mt-5 flex gap-2.5 rounded-xl bg-brand-teal/10 border border-brand-teal/25 p-3.5 text-xs leading-relaxed text-brand-navy/80">
                <Info size={15} className="text-brand-teal shrink-0 mt-0.5" aria-hidden="true" />
                <p>
                  Tiers count <strong>commission-paying</strong> completed sessions only. Commission-free sessions (your first pairing and first sessions with new students) do not advance your tier.
                </p>
              </div>

              <Link href="/signup" data-testid="link-commission-signup" className="mt-6 group inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-teal px-6 py-3.5 text-sm font-semibold text-brand-cream hover:bg-[#0b7559] transition-colors">
                Claim your first pairing
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
