import { useState } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { brandAsset } from "@/components/Brand";
import { Eyebrow, Reveal } from "./shared";

const paths = {
  tutor: {
    label: "For tutors",
    cta: { href: "/signup", text: "Create a tutor account" },
    steps: [
      ["Build your profile", "Subjects, year levels, your rate and how you teach. Submit your WWCC and details for admin review."],
      ["Open your calendar", "Set weekly availability once. Families book the times that suit you."],
      ["Teach and record", "Run sessions, log notes and progress, and keep invoices tidy from your teaching hub."],
    ],
  },
  family: {
    label: "For families",
    cta: { href: "/tutors", text: "Browse tutor profiles" },
    steps: [
      ["Add your students", "One parent account for every child you organise tutoring for."],
      ["Choose a tutor", "Compare profiles by subject, year level and teaching mode, then book an open time."],
      ["Follow the learning", "Session notes, progress records and invoices stay together in your dashboard."],
    ],
  },
} as const;

type Key = keyof typeof paths;

export default function HowItWorks() {
  const [tab, setTab] = useState<Key>("tutor");
  const reduce = useReducedMotion();
  const p = paths[tab];

  return (
    <section id="how" className="bg-brand-cream scroll-mt-28">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 lg:py-20 grid lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-14 items-center">
        <Reveal className="order-2 lg:order-1">
          <figure className="relative">
            <div className="aspect-[750/563] rounded-3xl overflow-hidden border-[6px] border-white shadow-[0_24px_50px_-28px_rgba(15,39,71,0.5)] rotate-[-1.5deg]">
              <img
                src={brandAsset("TutorFocused.jpg")}
                alt="Overhead view of a tutor and student working through problems on paper"
                className="w-full h-full object-cover"
                width={750}
                height={563}
                loading="eager"
              />
            </div>
            <figcaption className="absolute -bottom-4 right-6 rounded-full bg-brand-gold px-4 py-1.5 text-xs font-bold text-brand-navy shadow">
              Less admin. More of this.
            </figcaption>
          </figure>
        </Reveal>

        <div className="order-1 lg:order-2">
          <Reveal>
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl font-semibold text-brand-navy leading-tight">
              Three steps, whichever side of the desk you're on.
            </h2>
          </Reveal>

          <div role="tablist" aria-label="Choose a path" className="mt-6 inline-flex rounded-full bg-brand-navy/[0.06] p-1">
            {(Object.keys(paths) as Key[]).map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                data-testid={`tab-how-${k}`}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${tab === k ? "bg-brand-navy text-brand-cream" : "text-brand-navy/70 hover:text-brand-navy"}`}
              >
                {paths[k].label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.ol
              key={tab}
              initial={reduce ? false : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: -12 }}
              transition={{ duration: 0.25 }}
              className="mt-6 space-y-4"
            >
              {p.steps.map(([title, desc], i) => (
                <li key={title} className="flex gap-4">
                  <span className="font-display text-2xl font-semibold text-brand-teal w-8 shrink-0 leading-none pt-0.5">{String(i + 1).padStart(2, "0")}</span>
                  <div className="border-b border-brand-navy/10 pb-4 flex-1">
                    <h3 className="font-sans text-base font-bold text-brand-navy">{title}</h3>
                    <p className="text-sm text-brand-navy/65 mt-1 leading-relaxed">{desc}</p>
                  </div>
                </li>
              ))}
            </motion.ol>
          </AnimatePresence>

          <Link href={p.cta.href} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-teal hover:gap-3 transition-all">
            {p.cta.text} <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}
