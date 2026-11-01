import { CalendarClock, ReceiptText, NotebookPen, ShieldCheck, Users, GraduationCap } from "lucide-react";
import { brandAsset } from "@/components/Brand";
import { Eyebrow, IconChip, Reveal } from "./shared";

const tools = [
  { icon: CalendarClock, title: "Availability & bookings", desc: "Weekly slots you control; confirmed sessions in one calendar." },
  { icon: ReceiptText, title: "Invoices & statements", desc: "Session invoices and commission records kept with every booking." },
  { icon: NotebookPen, title: "Notes & progress", desc: "Log what was covered so families can follow the learning." },
  { icon: Users, title: "Multi-student families", desc: "Parents manage every child's tutoring from one account." },
  { icon: ShieldCheck, title: "WWCC review", desc: "Tutors submit a Working With Children Check for admin review before going live." },
  { icon: GraduationCap, title: "Scholix Academy", desc: "Guides on ABNs, pricing and running a sustainable tutoring practice." },
];

export default function Toolkit() {
  return (
    <section className="bg-white-paper border-y border-brand-navy/10">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 lg:py-20">
        <div className="grid lg:grid-cols-[1fr_340px] gap-10 items-end">
          <Reveal>
            <Eyebrow>The toolkit</Eyebrow>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl font-semibold text-brand-navy leading-tight max-w-xl">
              The back office a tutoring company would have, without the company.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-sm text-brand-navy/65 leading-relaxed">
              Independent tutors often run on text messages, bank transfers and loose paper. Scholix keeps the essentials together.
            </p>
          </Reveal>
        </div>

        <div className="mt-10 grid md:grid-cols-[1fr_1fr_0.9fr] gap-4">
          <div className="md:col-span-2 grid sm:grid-cols-2 gap-px rounded-3xl overflow-hidden bg-brand-navy/10 border border-brand-navy/10">
            {tools.map((t, i) => (
              <Reveal key={t.title} delay={i * 0.05} className="bg-brand-cream p-5 sm:p-6 h-full">
                <div className="flex gap-4">
                  <IconChip icon={t.icon} tone={i === 0 ? "navy" : i === 1 ? "gold" : "teal"} size="sm" />
                  <div>
                    <h3 className="font-sans text-[15px] font-bold text-brand-navy">{t.title}</h3>
                    <p className="text-sm text-brand-navy/65 mt-1 leading-relaxed">{t.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.15} className="relative rounded-3xl overflow-hidden min-h-[320px]">
            <img
              src={brandAsset("LearningDetail.jpg")}
              alt="Students studying together at a library table"
              className="absolute inset-0 w-full h-full object-cover object-center"
              width={900}
              height={1200}
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/85 via-brand-navy/10 to-transparent" />
            <p className="absolute bottom-5 left-5 right-5 font-display text-xl text-brand-cream leading-snug">
              Families see the notes, the bookings and the invoices, all in one place.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
