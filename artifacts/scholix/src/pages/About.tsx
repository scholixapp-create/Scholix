import { Link } from "wouter";
import { BookOpen, Shield, CreditCard, Calendar, Star, Users, ArrowRight, CheckCircle } from "lucide-react";
import TestModeBanner from "@/components/TestModeBanner";

const features = [
  {
    icon: <Calendar size={22} className="text-primary" />,
    title: "Smart scheduling",
    description: "Tutors set their weekly availability and parents book confirmed sessions in minutes — no back-and-forth emails.",
  },
  {
    icon: <CreditCard size={22} className="text-primary" />,
    title: "Transparent payments",
    description: "Parents pay through Scholix and tutors receive payouts automatically. Invoices are generated for every session.",
  },
  {
    icon: <Shield size={22} className="text-primary" />,
    title: "Verified tutors",
    description: "Every tutor on Scholix is verified with a current Working With Children Check and ABN before appearing in search results.",
  },
  {
    icon: <Star size={22} className="text-primary" />,
    title: "Progress tracking",
    description: "Tutors log session notes and scores after each lesson, giving parents a clear picture of their child's learning journey.",
  },
  {
    icon: <Users size={22} className="text-primary" />,
    title: "Multi-student families",
    description: "Add multiple children to one parent account and manage all their tutoring from a single dashboard.",
  },
  {
    icon: <BookOpen size={22} className="text-primary" />,
    title: "Tutor-run business",
    description: "Scholix handles admin, payments, and scheduling so tutors can focus entirely on teaching.",
  },
];

const stats = [
  { value: "200+", label: "Active tutors" },
  { value: "1,500+", label: "Sessions completed" },
  { value: "$50/hr", label: "Starting rate" },
  { value: "4.9★", label: "Average rating" },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <TestModeBanner />

      {/* Nav */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <BookOpen size={14} className="text-white" />
            </div>
            <span className="font-bold text-base text-foreground">Scholix</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link href="/signup" className="px-4 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-5 py-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-6">
          Built for Australian tutors
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-foreground leading-tight mb-4">
          About Scholix
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Scholix is a tutoring platform built specifically for independent Australian tutors and the families they work with.
          We handle scheduling, payments, compliance, and communication so you can focus on what matters — teaching.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link href="/signup" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:opacity-90 transition-opacity">
            Start tutoring free <ArrowRight size={16} />
          </Link>
          <Link href="/tutors" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border text-foreground font-semibold hover:bg-muted transition-colors">
            Find a tutor
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-sidebar">
        <div className="max-w-5xl mx-auto px-5 py-10 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-white">{s.value}</p>
              <p className="text-sm text-white/60 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-5 py-16">
        <h2 className="text-2xl font-bold text-foreground text-center mb-2">Everything a tutor needs</h2>
        <p className="text-muted-foreground text-center mb-10">One platform. No spreadsheets, no chasing payments.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-card border border-card-border rounded-xl p-5">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                {f.icon}
              </div>
              <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="bg-muted/40 border-y border-border">
        <div className="max-w-3xl mx-auto px-5 py-14 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Our mission</h2>
          <p className="text-muted-foreground leading-relaxed text-base">
            Independent tutors provide some of the most valuable education in Australia, yet most run their businesses
            using a patchwork of text messages, bank transfers, and paper notes. Scholix gives every independent tutor a
            professional-grade platform — the same tools a large tutoring company would have, without the overhead.
          </p>
        </div>
      </section>

      {/* Why Scholix */}
      <section className="max-w-5xl mx-auto px-5 py-16">
        <h2 className="text-2xl font-bold text-foreground text-center mb-10">Why tutors choose Scholix</h2>
        <div className="space-y-3 max-w-xl mx-auto">
          {[
            "No setup fees — free to join",
            "Verified WWCC and ABN on every tutor profile",
            "Automated invoices and commission statements",
            "Tiered commission: earn more as you grow",
            "WhatsApp connection with parents after booking",
            "Session reminders sent automatically",
          ].map((item) => (
            <div key={item} className="flex items-start gap-3">
              <CheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5" />
              <span className="text-sm text-foreground">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-sidebar">
        <div className="max-w-3xl mx-auto px-5 py-14 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to get started?</h2>
          <p className="text-white/70 mb-7">Join Scholix today and run your tutoring business with confidence.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:opacity-90 transition-opacity">
              Create your account <ArrowRight size={16} />
            </Link>
            <Link href="/tutors" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/10 transition-colors">
              Browse tutors
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background">
        <div className="max-w-5xl mx-auto px-5 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Scholix Pty Ltd · ABN 00 000 000 000</span>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/tutor-agreement" className="hover:text-foreground transition-colors">Tutor Agreement</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
