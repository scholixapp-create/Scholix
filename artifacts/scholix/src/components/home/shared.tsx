import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

export function Reveal({
  children,
  delay = 0,
  className = "",
  y = 22,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { y }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** One consistent icon treatment across the public site. */
export function IconChip({
  icon: Icon,
  tone = "teal",
  size = "md",
}: {
  icon: LucideIcon;
  tone?: "teal" | "navy" | "gold" | "cream";
  size?: "sm" | "md";
}) {
  const tones = {
    teal: "bg-brand-teal/10 text-brand-teal ring-brand-teal/20",
    navy: "bg-brand-navy text-brand-cream ring-brand-navy",
    gold: "bg-brand-gold/15 text-[#8a6a22] ring-brand-gold/40",
    cream: "bg-brand-cream/10 text-brand-gold ring-brand-cream/20",
  };
  const dim = size === "sm" ? "w-9 h-9" : "w-11 h-11";
  return (
    <span className={`inline-flex items-center justify-center ${dim} rounded-xl ring-1 ${tones[tone]} shrink-0`}>
      <Icon size={size === "sm" ? 17 : 20} strokeWidth={1.75} aria-hidden="true" />
    </span>
  );
}

export function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p className={`inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] ${light ? "text-brand-gold" : "text-brand-teal"}`}>
      <span className={`h-px w-6 ${light ? "bg-brand-gold" : "bg-brand-teal"}`} aria-hidden="true" />
      {children}
    </p>
  );
}
