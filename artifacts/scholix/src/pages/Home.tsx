import { useEffect, useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  BookOpen, Calendar, CreditCard, BarChart2, Shield, Star,
  CheckCircle, ArrowRight, ChevronDown, Menu, X, Users,
  GraduationCap, Zap, Clock, TrendingUp, Award, Heart,
} from "lucide-react";

// ── Animation helpers ──────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = (delay = 0.08) => ({
  hidden: {},
  show: { transition: { staggerChildren: delay } },
});

function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Navbar ─────────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = [
    { label: "Home", href: "#hero" },
    { label: "About Us", href: "#trust" },
    { label: "Profiles", href: "#features" },
  ];

  const scrollTo = (id: string) => {
    setOpen(false);
    const el = document.querySelector(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/95 backdrop-blur-md shadow-sm" : "bg-transparent"
      }`}
    >
      <nav className="max-w-6xl mx-auto px-5 sm:px-8 flex items-center justify-between h-16">
        {/* Logo */}
        <button onClick={() => scrollTo("#hero")} className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <BookOpen size={15} className="text-white" />
          </div>
          <span className={`font-bold text-lg tracking-tight transition-colors ${scrolled ? "text-[#1e3a5f]" : "text-white"}`}>
            Scholix
          </span>
        </button>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-7">
          {links.map((l) => (
            <button
              key={l.label}
              onClick={() => scrollTo(l.href)}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                scrolled ? "text-[#374151]" : "text-white/80"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => navigate("/login")}
            className={`text-sm font-medium transition-colors ${scrolled ? "text-[#374151] hover:text-primary" : "text-white/80 hover:text-white"}`}
          >
            Sign in
          </button>
          <Link
            href="/signup"
            className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
          >
            Sign up for free
          </Link>
        </div>

        {/* Mobile burger */}
        <button
          className={`md:hidden p-1.5 rounded-lg ${scrolled ? "text-[#1e3a5f]" : "text-white"}`}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-gray-100 overflow-hidden"
          >
            <div className="px-5 py-4 space-y-1">
              {links.map((l) => (
                <button
                  key={l.label}
                  onClick={() => scrollTo(l.href)}
                  className="block w-full text-left py-2.5 text-sm font-medium text-[#374151] hover:text-primary transition-colors"
                >
                  {l.label}
                </button>
              ))}
              <div className="pt-2 pb-1 space-y-2">
                <Link href="/login" className="block w-full text-center py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-[#374151]">
                  Sign in
                </Link>
                <Link href="/signup" className="block w-full text-center py-2.5 rounded-xl bg-primary text-white text-sm font-semibold">
                  Sign up for free
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// ── Hero ───────────────────────────────────────────────────────────────────

function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section
      id="hero"
      ref={ref}
      className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-[#0f2240]"
    >
      {/* Background gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-20 right-0 w-[400px] h-[400px] rounded-full bg-accent/15 blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 w-[300px] h-[300px] rounded-full bg-blue-400/10 blur-[80px]" />
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.6) 1px,transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <motion.div style={{ y, opacity }} className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 pt-28 pb-20 w-full">
        <div className="max-w-3xl">
          {/* Tag */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 text-white/70 text-xs font-medium mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Built for independent tutors
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight mb-6"
          >
            Run Your Own{" "}
            <span className="relative inline-block">
              <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-emerald-300">
                Tutoring Business.
              </span>
            </span>
            <br />
            We Handle the Rest.
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="text-lg text-white/60 max-w-xl mb-10 leading-relaxed"
          >
            Scheduling, payments, students, and structure — all in one platform. Focus on teaching. We'll handle everything else.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <Link
              href="/signup"
              className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/30"
            >
              Start Tutoring Free
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-white/10 border border-white/15 text-white font-semibold text-sm hover:bg-white/15 transition-colors backdrop-blur-sm"
            >
              Find a Tutor
            </Link>
          </motion.div>

          {/* Social trust line */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mt-10 flex items-center gap-4 text-white/40 text-xs"
          >
            <div className="flex -space-x-2">
              {["bg-blue-400", "bg-emerald-400", "bg-violet-400", "bg-amber-400"].map((c, i) => (
                <div key={i} className={`w-7 h-7 rounded-full border-2 border-[#0f2240] ${c} flex items-center justify-center text-[10px] font-bold text-white`}>
                  {["T", "S", "A", "M"][i]}
                </div>
              ))}
            </div>
            <span>Join 200+ tutors already on Scholix</span>
          </motion.div>
        </div>

        {/* Hero image placeholder */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="absolute right-0 top-1/2 -translate-y-1/2 hidden lg:block w-[440px] xl:w-[520px]"
        >
          {/* App mockup card */}
          <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-4 shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1588072432836-e10032774350?w=800&q=80"
              alt="Tutor working with student — replace with app screenshot"
              className="w-full aspect-[4/3] object-cover rounded-2xl opacity-70"
            />
            {/* Floating stat cards */}
            <div className="absolute -bottom-5 -left-6 bg-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
                <TrendingUp size={16} className="text-accent" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-medium">Avg weekly earnings</p>
                <p className="text-sm font-bold text-gray-800">$1,240+</p>
              </div>
            </div>
            <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calendar size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-medium">Sessions this week</p>
                <p className="text-sm font-bold text-gray-800">12 booked</p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/30"
        animate={{ y: [0, 5, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <span className="text-[10px] font-medium tracking-widest uppercase">Scroll</span>
        <ChevronDown size={14} />
      </motion.div>
    </section>
  );
}

// ── Value Props ────────────────────────────────────────────────────────────

function ValueProps() {
  const cards = [
    {
      icon: TrendingUp,
      color: "bg-primary/10 text-primary",
      title: "Earn More, Keep Control",
      desc: "Set your own hourly rate, own your schedule, and build a client base that's yours — not the platform's.",
    },
    {
      icon: Zap,
      color: "bg-amber-100 text-amber-600",
      title: "No Admin Headaches",
      desc: "Automated invoicing, built-in scheduling, and instant payments mean zero time wasted on paperwork.",
    },
    {
      icon: Heart,
      color: "bg-accent/10 text-accent",
      title: "Built for Students & Parents",
      desc: "Parents book and pay with confidence. Students track progress. Everyone stays in sync.",
    },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <FadeUp className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Why Scholix</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0f2240] tracking-tight">
            Everything a tutor needs.<br />Nothing they don't.
          </h2>
        </FadeUp>

        <motion.div
          variants={stagger(0.12)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="grid md:grid-cols-3 gap-6"
        >
          {cards.map((c) => (
            <motion.div
              key={c.title}
              variants={fadeUp}
              className="group relative bg-[#f9fafb] border border-gray-100 rounded-3xl p-7 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-5 ${c.color}`}>
                <c.icon size={20} />
              </div>
              <h3 className="text-lg font-bold text-[#0f2240] mb-2">{c.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{c.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ── How It Works ───────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    { n: "01", title: "Set your rate and availability", desc: "Create your tutor profile, set your hourly rate, and open time slots that work for you." },
    { n: "02", title: "Get booked by students", desc: "Parents browse your profile and book sessions directly. You get notified instantly." },
    { n: "03", title: "Get paid automatically", desc: "Payment is processed through the platform. You receive your earnings after every completed session." },
  ];

  return (
    <section className="py-24 bg-[#f0f4ff]">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <FadeUp className="text-center mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Simple process</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0f2240] tracking-tight">Up and running in minutes</h2>
        </FadeUp>

        <div className="relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-10 left-[calc(16.67%+20px)] right-[calc(16.67%+20px)] h-px bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />

          <motion.div
            variants={stagger(0.15)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="grid md:grid-cols-3 gap-8"
          >
            {steps.map((s) => (
              <motion.div key={s.n} variants={fadeUp} className="relative flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-full bg-white border-2 border-primary/20 flex items-center justify-center shadow-sm">
                    <span className="text-2xl font-black text-primary">{s.n}</span>
                  </div>
                </div>
                <h3 className="text-base font-bold text-[#0f2240] mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs">{s.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Image row */}
        <FadeUp delay={0.2} className="mt-16">
          <div className="rounded-3xl overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80"
              alt="Tutoring session in progress — replace with product screenshot"
              className="w-full h-56 sm:h-72 object-cover object-center"
            />
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

// ── Social Proof ───────────────────────────────────────────────────────────

function SocialProof() {
  const testimonials = [
    {
      name: "Sarah M.",
      role: "Maths Tutor · Sydney",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80",
      text: "I went from juggling spreadsheets and bank transfers to having everything in one place. My income has doubled since joining.",
      stars: 5,
    },
    {
      name: "James K.",
      role: "Science Tutor · Melbourne",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80",
      text: "The scheduling tool alone saves me hours every week. Parents love being able to book without back-and-forth messages.",
      stars: 5,
    },
    {
      name: "Priya L.",
      role: "Parent of two · Brisbane",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80",
      text: "Finding a verified, quality tutor for my daughter used to be stressful. Scholix made it simple — we booked within minutes.",
      stars: 5,
    },
  ];

  const stats = [
    { value: "$1,240+", label: "avg tutor earns per week" },
    { value: "200+", label: "tutors on the platform" },
    { value: "4.9★", label: "average tutor rating" },
    { value: "98%", label: "payment success rate" },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        {/* Stats strip */}
        <motion.div
          variants={stagger(0.1)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20"
        >
          {stats.map((s) => (
            <motion.div
              key={s.label}
              variants={fadeUp}
              className="text-center p-6 bg-gradient-to-br from-[#f0f4ff] to-white rounded-3xl border border-gray-100"
            >
              <p className="text-3xl font-extrabold text-[#0f2240] mb-1">{s.value}</p>
              <p className="text-xs text-gray-400 font-medium">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>

        <FadeUp className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Testimonials</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0f2240] tracking-tight">Tutors and parents love Scholix</h2>
        </FadeUp>

        <motion.div
          variants={stagger(0.12)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid md:grid-cols-3 gap-6"
        >
          {testimonials.map((t) => (
            <motion.div
              key={t.name}
              variants={fadeUp}
              className="bg-[#f9fafb] border border-gray-100 rounded-3xl p-6"
            >
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} size={13} className="fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mb-5">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <img src={t.avatar} alt={t.name} className="w-9 h-9 rounded-full object-cover" />
                <div>
                  <p className="text-sm font-semibold text-[#0f2240]">{t.name}</p>
                  <p className="text-[11px] text-gray-400">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ── Features ───────────────────────────────────────────────────────────────

function Features() {
  const features = [
    { icon: Calendar, color: "bg-primary/10 text-primary", title: "Smart Scheduling", desc: "Set your availability once. Students book around your life, not the other way around." },
    { icon: CreditCard, color: "bg-emerald-50 text-accent", title: "Payments Handled", desc: "Secure card payments collected upfront. No chasing invoices. No awkward money conversations." },
    { icon: Users, color: "bg-violet-50 text-violet-600", title: "Student Tracking", desc: "Keep notes, track session history, and monitor each student's progress over time." },
    { icon: BarChart2, color: "bg-amber-50 text-amber-600", title: "Earnings Dashboard", desc: "See exactly what you've earned, session by session. Download invoices instantly." },
    { icon: Award, color: "bg-rose-50 text-rose-500", title: "Verified Profiles", desc: "WWCC-checked tutors with reviewed credentials. Parents know they're hiring the best." },
    { icon: Clock, color: "bg-cyan-50 text-cyan-600", title: "Automated Reminders", desc: "Students and tutors get reminders 24 hours before every session. No more no-shows." },
  ];

  return (
    <section id="features" className="py-24 bg-[#0f2240]">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <FadeUp className="text-center mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-300 mb-3">Platform features</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Every tool you need.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-emerald-300">
              All in one place.
            </span>
          </h2>
        </FadeUp>

        <motion.div
          variants={stagger(0.08)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid sm:grid-cols-2 md:grid-cols-3 gap-4"
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              className="bg-white/5 border border-white/8 rounded-3xl p-6 hover:bg-white/8 transition-colors"
            >
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 ${f.color}`}>
                <f.icon size={18} />
              </div>
              <h3 className="text-sm font-bold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Platform screenshot placeholder */}
        <FadeUp delay={0.1} className="mt-14">
          <div className="relative rounded-3xl overflow-hidden border border-white/10">
            <img
              src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=1400&q=80"
              alt="Scholix dashboard preview — replace with actual app screenshot"
              className="w-full h-64 sm:h-80 object-cover object-top opacity-50"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f2240] via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6">
              <p className="text-white/40 text-xs font-medium">[ Replace with live app screenshot ]</p>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

// ── Trust ──────────────────────────────────────────────────────────────────

function Trust() {
  const pillars = [
    {
      icon: Shield,
      title: "WWCC Verified Tutors",
      desc: "Every tutor on Scholix submits a valid Working With Children Check before their profile goes live. Safety is non-negotiable.",
      img: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&q=80",
    },
    {
      icon: CheckCircle,
      title: "Quality Control System",
      desc: "Admin-reviewed tutor approvals, ongoing session monitoring, and a transparent ratings system keep standards high.",
      img: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&q=80",
    },
    {
      icon: Star,
      title: "Parent Feedback Loop",
      desc: "After every session, parents can rate and review. Top tutors get more visibility. Quality earns more.",
      img: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=80",
    },
  ];

  return (
    <section id="trust" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <FadeUp className="text-center mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Safety & trust</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0f2240] tracking-tight">A platform parents can trust</h2>
          <p className="text-gray-500 text-sm mt-3 max-w-lg mx-auto">
            We don't just connect tutors and families. We vet, verify, and monitor so everyone's experience is safe and high quality.
          </p>
        </FadeUp>

        <motion.div
          variants={stagger(0.12)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid md:grid-cols-3 gap-6"
        >
          {pillars.map((p) => (
            <motion.div
              key={p.title}
              variants={fadeUp}
              className="rounded-3xl overflow-hidden border border-gray-100 group"
            >
              <div className="relative overflow-hidden h-44">
                <img
                  src={p.img}
                  alt={`${p.title} — replace with relevant image`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f2240]/60 to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                    <p.icon size={16} className="text-white" />
                  </div>
                </div>
              </div>
              <div className="p-6 bg-[#f9fafb]">
                <h3 className="text-base font-bold text-[#0f2240] mb-2">{p.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{p.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ── Final CTA ──────────────────────────────────────────────────────────────

function FinalCTA() {
  const steps = [
    { n: 1, label: "Sign up" },
    { n: 2, label: "Select your profile type" },
    { n: 3, label: "Submit requirements" },
    { n: 4, label: "Create your space" },
    { n: 5, label: "Start teaching & earning" },
  ];

  return (
    <section className="py-28 bg-gradient-to-br from-[#0f2240] via-[#1a3a6e] to-[#0f2240] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-accent/10 blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-primary/20 blur-[100px]" />
      </div>

      <div className="relative max-w-4xl mx-auto px-5 sm:px-8 text-center">
        <FadeUp>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-300 mb-4">Get started today</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
            Start your tutoring business today
          </h2>
          <p className="text-white/50 text-base mb-12">Get Started in 5 Simple Steps</p>
        </FadeUp>

        {/* Steps strip */}
        <motion.div
          variants={stagger(0.1)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-0 mb-14"
        >
          {steps.map((s, i) => (
            <motion.div key={s.n} variants={fadeUp} className="flex items-center gap-2 sm:gap-0">
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-sm font-bold text-white mb-1.5">
                  {s.n}
                </div>
                <span className="text-[11px] text-white/50 font-medium text-center max-w-[80px] leading-tight">{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden sm:block w-10 h-px bg-white/15 mx-2 -mt-5" />
              )}
            </motion.div>
          ))}
        </motion.div>

        <FadeUp delay={0.2}>
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-primary text-white font-bold text-base hover:bg-primary/90 transition-all shadow-xl shadow-primary/30"
          >
            Sign up for free
            <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <p className="text-white/30 text-xs mt-4">No credit card required · Cancel anytime</p>
        </FadeUp>
      </div>
    </section>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────

function Footer() {
  const scrollTo = (id: string) => {
    const el = document.querySelector(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <footer className="bg-[#080f1a] text-white/40 py-14">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="flex flex-col md:flex-row justify-between gap-10 mb-12">
          {/* Brand */}
          <div className="max-w-xs">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <BookOpen size={14} className="text-white" />
              </div>
              <span className="font-bold text-lg text-white">Scholix</span>
            </div>
            <p className="text-sm text-white/30 leading-relaxed">
              The tutoring platform that empowers independent educators and connects families with expert tutors.
            </p>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
            <div>
              <p className="text-white font-semibold mb-4">Platform</p>
              <ul className="space-y-2.5">
                <li><button onClick={() => scrollTo("#hero")} className="hover:text-white transition-colors">Home</button></li>
                <li><button onClick={() => scrollTo("#features")} className="hover:text-white transition-colors">Features</button></li>
                <li><button onClick={() => scrollTo("#trust")} className="hover:text-white transition-colors">About Us</button></li>
              </ul>
            </div>
            <div>
              <p className="text-white font-semibold mb-4">Account</p>
              <ul className="space-y-2.5">
                <li><Link href="/signup" className="hover:text-white transition-colors">Sign up</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Sign in</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-white font-semibold mb-4">Legal</p>
              <ul className="space-y-2.5">
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="mailto:hello@scholix.app" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p>© {new Date().getFullYear()} Scholix. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            <GraduationCap size={12} />
            Empowering educators everywhere
          </p>
        </div>
      </div>
    </footer>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <ValueProps />
      <HowItWorks />
      <SocialProof />
      <Features />
      <Trust />
      <FinalCTA />
      <Footer />
    </div>
  );
}

export default function Home() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      switch (user.role) {
        case "tutor": navigate("/tutor/dashboard"); break;
        case "parent": navigate("/parent/dashboard"); break;
        case "student": navigate("/student/dashboard"); break;
        case "admin": navigate("/admin/dashboard"); break;
      }
    }
  }, [user, isLoading]);

  if (isLoading) return null;
  if (user) return null;

  return <LandingPage />;
}
