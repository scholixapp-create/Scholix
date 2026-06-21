import { Link } from "wouter";
import { ArrowLeft, Shield, CheckCircle, Users, Clock, BookOpen, Heart } from "lucide-react";
import TestModeBanner from "@/components/TestModeBanner";

const STANDARDS = [
  {
    icon: Shield,
    color: "bg-blue-100 text-blue-600",
    title: "Safeguarding and Child Safety",
    items: [
      "Maintain a valid Working With Children Check at all times",
      "Never engage in any conduct that could harm or exploit a child",
      "Report any safeguarding concerns immediately to relevant authorities and Scholix",
      "Do not communicate with students outside approved channels in a manner inconsistent with a professional tutoring relationship",
      "Never meet a student in an unsupervised private setting without prior parent knowledge and consent",
    ],
  },
  {
    icon: Users,
    color: "bg-emerald-100 text-emerald-600",
    title: "Respect and Inclusion",
    items: [
      "Treat every student, parent, and colleague with dignity and respect",
      "Practise inclusive teaching that supports students of all backgrounds, abilities, and learning styles",
      "Do not discriminate on the basis of race, gender, disability, religion, sexuality, cultural background, or any other protected attribute",
      "Acknowledge and work constructively with each student's individual learning needs",
      "Foster a positive, encouraging, and psychologically safe learning environment",
    ],
  },
  {
    icon: Clock,
    color: "bg-amber-100 text-amber-600",
    title: "Punctuality and Professionalism",
    items: [
      "Arrive to every session on time and fully prepared",
      "Give reasonable advance notice if you need to cancel or reschedule a session",
      "Respond to parent and student communications promptly",
      "Present yourself professionally in all interactions on and off the platform",
      "Maintain appropriate professional boundaries at all times",
    ],
  },
  {
    icon: BookOpen,
    color: "bg-purple-100 text-purple-600",
    title: "Teaching Quality and Preparation",
    items: [
      "Prepare session content appropriate to the student's year level, subject, and learning goals",
      "Adapt your teaching approach to support each student's individual needs",
      "Record meaningful, accurate progress notes after each session",
      "Support students in developing their own knowledge and problem-solving skills",
      "Stay current with the relevant curriculum (Victorian Curriculum and VCE where applicable)",
    ],
  },
  {
    icon: Heart,
    color: "bg-red-100 text-red-600",
    title: "Academic Integrity",
    items: [
      "Support genuine learning — never complete graded work on behalf of a student",
      "Do not assist students in misrepresenting their own work to schools or institutions",
      "Be honest with parents about student progress, including challenges",
      "Encourage students to develop their own understanding rather than dependency",
      "Uphold the educational values of honesty, effort, and growth",
    ],
  },
  {
    icon: CheckCircle,
    color: "bg-primary/10 text-primary",
    title: "Platform Conduct",
    items: [
      "Keep your Scholix profile accurate and up to date at all times",
      "Do not solicit clients to move off the platform to avoid Scholix fees",
      "Report any concerns about platform safety or policy violations through official channels",
      "Cooperate with Scholix administrators during any compliance or verification review",
      "Maintain the confidentiality of student information at all times",
    ],
  },
];

export default function TutorCodeOfConduct() {
  return (
    <>
      <TestModeBanner />
      <div className="min-h-screen bg-[#f9fafb]">
        <div className="bg-[#0f2240] px-5 pt-8 pb-6">
          <div className="max-w-2xl mx-auto">
            <Link href="/" className="inline-flex items-center gap-1.5 text-white/60 text-sm mb-5 hover:text-white transition-colors">
              <ArrowLeft size={14} /> Back
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shrink-0">
                <Shield size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-white">Tutor Code of Conduct</h1>
                <p className="text-sm text-white/60 mt-0.5">Last updated: June 2026 · Version 2.0</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-5">
            <p className="text-sm font-semibold text-emerald-800">Required for tutor approval</p>
            <p className="text-xs text-emerald-700 mt-1 leading-relaxed">All tutors must read and agree to this Code of Conduct before their profile can be approved. Acceptance is recorded at the time of verification submission.</p>
          </div>

          <div className="mb-5">
            <p className="text-sm text-gray-600 leading-relaxed">Scholix tutors are trusted professionals who play a meaningful role in the lives of their students. This Code of Conduct sets out the professional and ethical standards we expect from every tutor on our platform — not as a set of rules to comply with, but as a shared commitment to quality, safety, and integrity.</p>
          </div>

          <div className="space-y-4 mb-6">
            {STANDARDS.map(({ icon: Icon, color, title, items }) => (
              <div key={title} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                    <Icon size={17} />
                  </div>
                  <h2 className="text-sm font-bold text-gray-900">{title}</h2>
                </div>
                <ul className="space-y-1.5 pl-0">
                  {items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed">
                      <CheckCircle size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="bg-gray-900 rounded-2xl p-5 mb-5">
            <h2 className="text-sm font-bold text-white mb-2">Consequences of Breach</h2>
            <p className="text-xs text-white/60 leading-relaxed">Scholix may suspend or permanently remove any tutor who breaches this Code of Conduct, the Tutor Agreement, or the Terms of Service. Serious breaches — particularly those involving child safety, harassment, or fraud — may be referred to relevant authorities without prior notice. We take our obligations to the safety of students and families very seriously.</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
            <h2 className="text-sm font-bold text-gray-900 mb-2">Reporting a Concern</h2>
            <p className="text-xs text-gray-600 leading-relaxed mb-3">If you witness or experience conduct that breaches this Code of Conduct, please report it through the platform or contact us directly:</p>
            <div className="space-y-1">
              <p className="text-xs text-gray-700"><span className="font-medium">Safety concerns:</span> <a href="mailto:support@scholix.com.au" className="text-primary hover:underline">support@scholix.com.au</a></p>
              <p className="text-xs text-gray-700"><span className="font-medium">Legal matters:</span> <a href="mailto:legal@scholix.com.au" className="text-primary hover:underline">legal@scholix.com.au</a></p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/tutor-agreement" className="text-sm text-primary hover:underline">Tutor Agreement</Link>
            <span className="text-gray-300">·</span>
            <Link href="/terms" className="text-sm text-primary hover:underline">Terms of Service</Link>
            <span className="text-gray-300">·</span>
            <Link href="/privacy" className="text-sm text-primary hover:underline">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </>
  );
}
