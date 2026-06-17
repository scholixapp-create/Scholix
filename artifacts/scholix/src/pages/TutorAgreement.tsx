import { Link } from "wouter";
import { ArrowLeft, BookOpen } from "lucide-react";
import TestModeBanner from "@/components/TestModeBanner";

export default function TutorAgreement() {
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
                <h1 className="text-2xl font-extrabold text-white">Tutor Agreement</h1>
                <p className="text-sm text-white/60 mt-0.5">Last updated: June 2026 · Version 1.0</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
            <p className="text-sm font-semibold text-amber-800">For tutors only</p>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">This agreement applies to all tutors registered on Scholix. By completing the onboarding process, you agree to these terms in addition to the general Terms of Service.</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5 prose prose-sm max-w-none text-gray-700 leading-relaxed">

            <h2 className="text-base font-bold text-gray-900 mt-0">1. Independent Contractor Status</h2>
            <p>You are an independent contractor, not an employee of Scholix. You are responsible for your own tax obligations, superannuation, and insurance. Scholix recommends obtaining professional indemnity insurance.</p>

            <h2 className="text-base font-bold text-gray-900">2. WWCC Obligation</h2>
            <p>You must hold a valid Victorian Working With Children Check (WWCC) at all times while active on the platform. You must:</p>
            <ul>
              <li>Upload your WWCC card during onboarding</li>
              <li>Notify Scholix immediately if your WWCC is revoked, suspended, or expires</li>
              <li>Renew your WWCC before it expires to remain eligible to teach</li>
            </ul>
            <p>Scholix will notify you 90 days before your WWCC expiry and will automatically suspend your account if your WWCC expires without renewal.</p>

            <h2 className="text-base font-bold text-gray-900">3. Rates and Commission</h2>
            <p>You set your own hourly rate, subject to a minimum of $65/hr. Scholix deducts a platform commission from the session fee based on your tier (see Terms of Service for rates). Payment is the responsibility of the parent/guardian to organise directly with you.</p>

            <h2 className="text-base font-bold text-gray-900">4. Session Conduct</h2>
            <p>You agree to:</p>
            <ul>
              <li>Arrive on time and prepared for all booked sessions</li>
              <li>Conduct sessions in a safe, professional environment</li>
              <li>Log progress notes on the platform after each session</li>
              <li>Never meet students one-on-one in private locations without parental consent and appropriate safeguarding measures</li>
            </ul>

            <h2 className="text-base font-bold text-gray-900">5. Cancellation Policy</h2>
            <p>You should provide at least 24 hours' notice for cancellations where possible. Repeated last-minute cancellations may result in account suspension.</p>

            <h2 className="text-base font-bold text-gray-900">6. Confidentiality</h2>
            <p>You agree to keep all student and family information confidential. You must not share or use personal information for any purpose outside of the tutoring relationship.</p>

            <h2 className="text-base font-bold text-gray-900">7. ABN Requirement</h2>
            <p>You must have an active Australian Business Number (ABN) to receive payment as a contractor. Scholix will not withhold tax on payments, so you are responsible for declaring income appropriately.</p>

            <h2 className="text-base font-bold text-gray-900">8. Termination</h2>
            <p>Either party may terminate this agreement with 7 days' notice. Scholix may terminate immediately for serious breaches including WWCC expiry, misconduct, or fraud.</p>

            <h2 className="text-base font-bold text-gray-900">9. Governing Law</h2>
            <p>This agreement is governed by the laws of Victoria, Australia.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/terms" className="text-sm text-primary hover:underline">Terms of Service</Link>
            <span className="text-gray-300">·</span>
            <Link href="/privacy" className="text-sm text-primary hover:underline">Privacy Policy</Link>
            <span className="text-gray-300">·</span>
            <Link href="/signup" className="text-sm text-primary hover:underline">Join as a tutor</Link>
          </div>
        </div>
      </div>
    </>
  );
}
