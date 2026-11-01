import { Link } from "wouter";
import { ArrowRight, FlaskConical } from "lucide-react";
import { AccountNavigation } from "@/components/AccountNavigation";
import { BrandBanner, BrandStar } from "@/components/Brand";
import { Reveal } from "./shared";

const steps = ["Sign up", "Choose tutor or parent", "Submit requirements", "Set up your space", "Start teaching"];

export function ClosingCTA() {
  return (
    <section className="bg-brand-cream">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14">
        <Reveal className="relative overflow-hidden rounded-[2rem] bg-brand-teal text-brand-cream px-6 py-10 sm:px-12 sm:py-12">
          <BrandStar size={200} className="absolute -right-10 -bottom-12 opacity-20 sx-float pointer-events-none" />
          <div className="relative grid lg:grid-cols-[1.2fr_1fr] gap-8 items-center">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold leading-tight">
                Bring your first student. Pay 0% platform commission on that pairing, ongoing.
              </h2>
              <p className="mt-3 text-sm text-brand-cream/80">Free to join. Tutor profiles go live after admin review.</p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link href="/signup" data-testid="link-cta-signup" className="group inline-flex items-center justify-center gap-2 rounded-full bg-brand-navy px-7 py-3.5 text-sm font-semibold text-brand-cream hover:bg-brand-ink transition-colors">
                  Create your account <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link href="/tutors" className="inline-flex items-center justify-center rounded-full border border-brand-cream/40 px-7 py-3.5 text-sm font-semibold hover:bg-brand-cream/10 transition-colors">
                  Browse tutors
                </Link>
              </div>
            </div>
            <ol className="space-y-2">
              {steps.map((s, i) => (
                <li key={s} className="flex items-center gap-3 text-sm">
                  <span className="w-7 h-7 rounded-full bg-brand-cream text-brand-teal font-bold text-xs flex items-center justify-center">{i + 1}</span>
                  <span className="font-medium">{s}</span>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function HomeFooter() {
  return (
    <footer className="bg-brand-navy text-brand-cream/60">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 grid md:grid-cols-[1.3fr_1fr_1fr_1fr] gap-8 text-sm">
        <div>
          <div className="inline-flex max-w-full rounded-xl bg-brand-cream p-3">
            <BrandBanner className="w-64 max-w-full" />
          </div>
          <p className="mt-4 max-w-xs leading-relaxed">An Australian platform for independent tutors and the families they teach.</p>
          <p className="mt-4 inline-flex items-start gap-2 text-xs text-brand-gold">
            <FlaskConical size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            Beta: payments are simulated and real payouts are not yet live.
          </p>
        </div>
        <div>
          <p className="text-brand-cream font-semibold mb-3">Platform</p>
          <ul className="space-y-2">
            <li><Link href="/about" className="hover:text-brand-cream transition-colors">About Scholix</Link></li>
            <li><Link href="/tutors" className="hover:text-brand-cream transition-colors">Find tutors</Link></li>
            <li><a href="#commission" className="hover:text-brand-cream transition-colors">Commission tiers</a></li>
          </ul>
        </div>
        <div>
          <p className="text-brand-cream font-semibold mb-3">Account</p>
          <div className="text-brand-cream"><AccountNavigation /></div>
        </div>
        <div>
          <p className="text-brand-cream font-semibold mb-3">Legal</p>
          <ul className="space-y-2">
            <li><Link href="/terms" className="hover:text-brand-cream transition-colors">Terms</Link></li>
            <li><Link href="/privacy" className="hover:text-brand-cream transition-colors">Privacy</Link></li>
            <li><Link href="/tutor-agreement" className="hover:text-brand-cream transition-colors">Tutor Agreement</Link></li>
            <li><a href="mailto:support@scholix.com.au" className="hover:text-brand-cream transition-colors">Contact</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-brand-cream/10">
        <p className="max-w-6xl mx-auto px-5 sm:px-8 py-5 text-xs">© {new Date().getFullYear()} Scholix</p>
      </div>
    </footer>
  );
}
