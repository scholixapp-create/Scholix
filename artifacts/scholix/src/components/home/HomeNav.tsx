import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, X } from "lucide-react";
import TestModeBanner from "@/components/TestModeBanner";
import { AccountNavigation } from "@/components/AccountNavigation";
import { Brand } from "@/components/Brand";

const links = [
  { label: "Commission", href: "#commission" },
  { label: "How it works", href: "#how" },
  { label: "About", href: "/about" },
  { label: "Find tutors", href: "/tutors" },
];

export default function HomeNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12);
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const jump = (href: string) => {
    setOpen(false);
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  const item = "text-sm font-medium text-brand-navy/80 hover:text-brand-teal transition-colors";

  return (
    <header className={`sticky top-0 z-50 transition-shadow ${scrolled ? "shadow-[0_6px_24px_-12px_rgba(15,39,71,0.25)]" : ""}`}>
      <TestModeBanner />
      <div className="bg-brand-cream/95 backdrop-blur border-b border-brand-navy/10">
        <nav aria-label="Site navigation" className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
          <Link href="/" aria-label="Scholix home" data-testid="link-home-logo">
            <Brand size={34} />
          </Link>
          <div className="hidden md:flex items-center gap-7">
            {links.map((l) =>
              l.href.startsWith("#") ? (
                <button key={l.label} onClick={() => jump(l.href)} className={item}>{l.label}</button>
              ) : (
                <Link key={l.label} href={l.href} className={item}>{l.label}</Link>
              ),
            )}
          </div>
          <div className="hidden md:flex items-center text-brand-navy">
            <AccountNavigation />
          </div>
          <button
            className="md:hidden p-2 rounded-lg text-brand-navy hover:bg-brand-navy/5"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            data-testid="button-mobile-menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-brand-navy/10 bg-brand-cream"
            >
              <div className="px-5 py-4 space-y-1">
                {links.map((l) =>
                  l.href.startsWith("#") ? (
                    <button key={l.label} onClick={() => jump(l.href)} className={`block w-full text-left py-2.5 ${item}`}>{l.label}</button>
                  ) : (
                    <Link key={l.label} href={l.href} onClick={() => setOpen(false)} className={`block py-2.5 ${item}`}>{l.label}</Link>
                  ),
                )}
                <div className="pt-3 text-brand-navy"><AccountNavigation /></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
