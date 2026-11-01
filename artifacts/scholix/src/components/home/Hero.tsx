import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CalendarCheck, Handshake } from "lucide-react";
import { brandAsset, BrandStar } from "@/components/Brand";
import { EASE } from "./shared";

export default function Hero() {
  const reduce = useReducedMotion();
  const enter = (d: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay: d, ease: EASE } };

  return (
    <section id="hero" className="relative overflow-hidden bg-brand-cream paper-grain">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-10 pb-14 lg:pt-14 lg:pb-16 grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-12 items-center">
        <div>
          <motion.p {...enter(0.05)} className="inline-flex items-center gap-2 rounded-full border border-brand-navy/15 bg-white/60 px-3 py-1 text-xs font-semibold text-brand-navy">
            <BrandStar size={14} /> Australian tutoring, run by tutors
          </motion.p>

          <motion.h1 {...enter(0.12)} className="mt-5 font-display text-[2.6rem] leading-[1.02] sm:text-6xl lg:text-[4.1rem] font-semibold text-brand-navy">
            Your tutoring business,{" "}
            <span className="italic text-brand-teal">properly</span>{" "}
            <span className="gold-underline">organised.</span>
          </motion.h1>

          <motion.p {...enter(0.2)} className="mt-5 text-base sm:text-lg text-brand-navy/70 max-w-xl leading-relaxed">
            Scholix gives independent tutors a home for bookings, availability, invoices and lesson notes, and gives families one calm place to organise their children's learning.
          </motion.p>

          <motion.div {...enter(0.28)} className="mt-7 flex flex-col sm:flex-row gap-3">
            <Link href="/signup" data-testid="link-hero-start-tutoring" className="group inline-flex items-center justify-center gap-2 rounded-full bg-brand-navy px-7 py-3.5 text-sm font-semibold text-brand-cream hover:bg-brand-ink transition-colors">
              Start tutoring with Scholix
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="/tutors" data-testid="link-hero-find-tutor" className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-navy/20 bg-white/50 px-7 py-3.5 text-sm font-semibold text-brand-navy hover:border-brand-teal hover:text-brand-teal transition-colors">
              Find a tutor
            </Link>
          </motion.div>

          {/* Offer ticket — the first thing tutors should notice */}
          <motion.a
            {...enter(0.36)}
            href="#commission"
            data-testid="link-hero-offer"
            className="mt-8 group flex items-stretch max-w-xl rounded-2xl border border-brand-gold/60 bg-white/70 overflow-hidden hover:border-brand-gold transition-colors"
          >
            <span className="flex flex-col items-center justify-center bg-brand-gold px-4 sm:px-5 text-brand-navy">
              <span className="font-display text-3xl font-semibold leading-none">0%</span>
              <span className="text-[10px] font-bold uppercase tracking-wider mt-1">platform fee</span>
            </span>
            <span className="flex-1 px-4 py-3 border-l-2 border-dashed border-brand-gold/60">
              <span className="block text-sm font-bold text-brand-navy">On your first student pairing — ongoing.</span>
              <span className="block text-xs text-brand-navy/65 mt-0.5">Plus 0% platform commission on your first completed session with every new student. See the tiers <ArrowRight size={11} className="inline -mt-0.5" /></span>
            </span>
          </motion.a>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
          className="relative mx-auto w-full max-w-[420px] lg:max-w-none"
        >
          <div className="relative aspect-[736/920] rounded-t-[999px] rounded-b-3xl overflow-hidden border-[6px] border-white shadow-[0_30px_60px_-30px_rgba(15,39,71,0.55)]">
            <img
              src={brandAsset("MainHero.jpg")}
              alt="A small group studying together around a table in front of a whiteboard"
              className="w-full h-full object-cover object-[50%_35%]"
              width={736}
              height={981}
            />
          </div>
          <BrandStar size={56} className="absolute -top-2 -right-1 sx-float" />
          <div className="absolute -left-3 sm:-left-8 bottom-16 rounded-2xl bg-white shadow-lg px-4 py-3 flex items-center gap-3 border border-brand-navy/10">
            <span className="w-9 h-9 rounded-xl bg-brand-teal/10 text-brand-teal flex items-center justify-center"><CalendarCheck size={18} strokeWidth={1.75} /></span>
            <span>
              <span className="block text-[10px] uppercase tracking-wider font-bold text-brand-navy/50">Tutors</span>
              <span className="block text-sm font-semibold text-brand-navy">Set your own availability</span>
            </span>
          </div>
          <div className="absolute -right-2 sm:-right-6 bottom-0 rounded-2xl bg-brand-navy shadow-lg px-4 py-3 flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-brand-cream/10 text-brand-gold flex items-center justify-center"><Handshake size={18} strokeWidth={1.75} /></span>
            <span>
              <span className="block text-[10px] uppercase tracking-wider font-bold text-brand-cream/60">Families</span>
              <span className="block text-sm font-semibold text-brand-cream">Book and track in one place</span>
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
