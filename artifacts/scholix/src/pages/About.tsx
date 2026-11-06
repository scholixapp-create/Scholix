import { Link } from "wouter";
import { BrandMark } from "@/components/Brand";
import { BookOpen, Shield, CreditCard, Calendar, Star, Users, ArrowRight, CheckCircle } from "lucide-react";
import TestModeBanner from "@/components/TestModeBanner";
import { AccountNavigation } from "@/components/AccountNavigation";
import type { ReactNode } from "react";

const brandBase = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/brand`;

function StudySection({
  image, dark = false, position = "center 60%", className = "", children,
}: {
  image: "MainHero.jpg" | "TutorFocused.jpg" | "LearningDetail.jpg";
  dark?: boolean;
  position?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`relative isolate overflow-hidden ${dark ? "bg-sidebar" : "bg-brand-cream"} ${className}`}>
      <div className="absolute inset-0 -z-10 pointer-events-none select-none" aria-hidden="true">
        <img
          src={`${brandBase}/${image}`}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className="w-full h-full object-cover"
          style={{ objectPosition: position }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: dark
              ? "linear-gradient(110deg, rgba(15,39,71,.95), rgba(15,39,71,.84) 55%, rgba(15,39,71,.91))"
              : "linear-gradient(110deg, rgba(250,247,240,.95), rgba(250,247,240,.84) 55%, rgba(250,247,240,.76))",
          }}
        />
      </div>
      {children}
    </section>
  );
}

const features = [
  {
    icon: <Calendar size={22} className="text-primary" />,
    title: "Smart scheduling",
    description: "Tutors set their weekly availability and parents book confirmed sessions in minutes, without back-and-forth emails.",
  },
  {
    icon: <CreditCard size={22} className="text-primary" />,
    title: "Transparent payments",
    description: "Keep booking and invoice records together. During beta, payments are simulated and no real charges are processed.",
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
  { value: "Flexible", label: "Tutor-set availability" },
  { value: "Connected", label: "Tutors and families" },
  { value: "Organised", label: "Bookings in one place" },
  { value: "Visible", label: "Learning progress" },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <TestModeBanner />

      {/* Nav */}
      <header className="sticky top-0 z-40 bg-brand-cream/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-5 min-h-14 py-2 flex flex-wrap gap-3 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-bold text-base text-foreground">Scholix</span>
          </Link>
          <div className="flex items-center gap-3">
            <AccountNavigation />
          </div>
        </div>
      </header>

      {/* Hero */}
      <StudySection image="TutorFocused.jpg" position="center 45%">
        <div className="max-w-5xl mx-auto px-5 py-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-6">
          Built for Australian tutors
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-foreground leading-tight mb-4">
          About Scholix
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Scholix is a tutoring platform built specifically for independent Australian tutors and the families they work with.
          We handle scheduling, payments, compliance, and communication so you can focus on what matters: teaching.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link href="/signup" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:opacity-90 transition-opacity">
            Start tutoring free <ArrowRight size={16} />
          </Link>
          <Link href="/tutors" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border text-foreground font-semibold hover:bg-muted transition-colors">
            Find a tutor
          </Link>
        </div>
        </div>
      </StudySection>

      {/* Stats */}
      <StudySection image="MainHero.jpg" dark position="center 65%">
        <div className="max-w-5xl mx-auto px-5 py-10 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-white">{s.value}</p>
              <p className="text-sm text-white/60 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </StudySection>

      {/* Features */}
      <StudySection image="LearningDetail.jpg" position="center 65%">
        <div className="max-w-5xl mx-auto px-5 py-16">
        <h2 className="text-2xl font-bold text-foreground text-center mb-2">Everything a tutor needs</h2>
        <p className="text-muted-foreground text-center mb-10">One platform. No spreadsheets, no chasing payments.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-card/95 border border-card-border rounded-xl p-5">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                {f.icon}
              </div>
              <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
        </div>
      </StudySection>

      {/* Mission */}
      <StudySection image="MainHero.jpg" className="border-y border-border" position="center 60%">
        <div className="max-w-3xl mx-auto px-5 py-14 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Our mission</h2>
          <p className="text-muted-foreground leading-relaxed text-base">
            Independent tutors provide some of the most valuable education in Australia, yet most run their businesses
            using a patchwork of text messages, bank transfers, and paper notes. Scholix gives every independent tutor a
            professional-grade platform with the same tools a large tutoring company would have, without the overhead.
          </p>
        </div>
      </StudySection>

      {/* Why Scholix */}
      <StudySection image="TutorFocused.jpg" position="center 65%">
        <div className="max-w-5xl mx-auto px-5 py-16">
        <h2 className="text-2xl font-bold text-foreground text-center mb-10">Why tutors choose Scholix</h2>
        <div className="space-y-3 max-w-xl mx-auto">
          {[
            "No setup fees. Free to join",
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
        </div>
      </StudySection>

      {/* CTA */}
      <StudySection image="LearningDetail.jpg" dark position="center 70%">
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
      </StudySection>

      {/* Footer */}
      <footer className="border-t border-border bg-background">
        <div className="max-w-5xl mx-auto px-5 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Scholix</span>
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
