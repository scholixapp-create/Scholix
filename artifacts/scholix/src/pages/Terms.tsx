import { Link } from "wouter";
import { ArrowLeft, BookOpen } from "lucide-react";
import TestModeBanner from "@/components/TestModeBanner";

export default function TermsOfService() {
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
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
                <BookOpen size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-white">Terms of Service</h1>
                <p className="text-sm text-white/60 mt-0.5">Last updated: June 2026 · Version 1.0</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5 prose prose-sm max-w-none text-gray-700 leading-relaxed">

            <h2 className="text-base font-bold text-gray-900 mt-0">1. Acceptance of Terms</h2>
            <p>By creating an account on Scholix, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, you must not use the platform.</p>

            <h2 className="text-base font-bold text-gray-900">2. Platform Overview</h2>
            <p>Scholix is a tutoring marketplace that connects parents, students and tutors in Australia. The platform facilitates session bookings, payments, and communication between parties.</p>
            <p>Scholix is currently in beta. Payments are simulated — no real financial transactions occur through the platform at this time. Tutors and parents must arrange direct payment separately.</p>

            <h2 className="text-base font-bold text-gray-900">3. Eligibility</h2>
            <p>You must be at least 18 years old to create an account. Students under 18 must be registered by a parent or guardian.</p>

            <h2 className="text-base font-bold text-gray-900">4. Tutor Requirements</h2>
            <p>All tutors must:</p>
            <ul>
              <li>Hold a valid Working With Children Check (WWCC) issued in Victoria, Australia</li>
              <li>Have an Australian Business Number (ABN) or operate as an individual contractor</li>
              <li>Provide accurate information about their qualifications and experience</li>
              <li>Charge a minimum rate of $65/hr as set by the platform</li>
            </ul>
            <p>Scholix reserves the right to suspend or remove tutors who fail to maintain a valid WWCC or who provide false information.</p>

            <h2 className="text-base font-bold text-gray-900">5. Commission and Payments</h2>
            <p>Scholix charges a platform commission on each completed session based on the tutor's tier:</p>
            <ul>
              <li>Starter (0–9 sessions): 30% platform fee</li>
              <li>Growth (10–24 sessions): 25% platform fee</li>
              <li>Established (25–49 sessions): 20% platform fee</li>
              <li>Expert (50+ sessions): 15% platform fee</li>
            </ul>
            <p>Special rules apply for a tutor's first student and first session with any new student (0% commission).</p>

            <h2 className="text-base font-bold text-gray-900">6. Conduct</h2>
            <p>All users agree to treat each other with respect. Abusive, discriminatory or inappropriate behaviour may result in immediate account termination.</p>

            <h2 className="text-base font-bold text-gray-900">7. Limitation of Liability</h2>
            <p>Scholix is a marketplace platform and is not responsible for the quality of tutoring sessions, disputes between tutors and parents, or any direct/indirect damages arising from use of the platform.</p>

            <h2 className="text-base font-bold text-gray-900">8. Changes to Terms</h2>
            <p>We may update these terms from time to time. Continued use of Scholix after changes constitutes acceptance of the updated terms.</p>

            <h2 className="text-base font-bold text-gray-900">9. Contact</h2>
            <p>Questions about these terms? Contact us at <a href="mailto:legal@scholix.com.au" className="text-primary hover:underline">legal@scholix.com.au</a></p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/privacy" className="text-sm text-primary hover:underline">Privacy Policy</Link>
            <span className="text-gray-300">·</span>
            <Link href="/tutor-agreement" className="text-sm text-primary hover:underline">Tutor Agreement</Link>
            <span className="text-gray-300">·</span>
            <Link href="/signup" className="text-sm text-primary hover:underline">Create account</Link>
          </div>
        </div>
      </div>
    </>
  );
}
