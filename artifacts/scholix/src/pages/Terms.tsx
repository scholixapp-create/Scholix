import { Link } from "wouter";
import { ArrowLeft, BookOpen } from "lucide-react";
import TestModeBanner from "@/components/TestModeBanner";

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <>
      <h2 className="text-base font-bold text-gray-900 mt-6 first:mt-0">{n}. {title}</h2>
      {children}
    </>
  );
}

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
                <p className="text-sm text-white/60 mt-0.5">Last updated: June 2026 · Version 2.0</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5">
            <p className="text-sm font-semibold text-blue-800">Beta Platform Notice</p>
            <p className="text-xs text-blue-700 mt-1 leading-relaxed">Scholix is currently in beta. Payments are simulated — no real financial transactions are processed through the platform at this time. Tutors and parents may need to arrange payment directly during this phase.</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5 prose prose-sm max-w-none text-gray-700 leading-relaxed">

            <Section n="1" title="Acceptance of Terms">
              <p>By creating an account on Scholix or using any part of our platform, you agree to be bound by these Terms of Service ("Terms") and our Privacy Policy. If you do not agree, you must not use Scholix. These Terms form a legally binding agreement between you and Scholix Pty Ltd.</p>
            </Section>

            <Section n="2" title="Platform Role">
              <p>Scholix is a technology marketplace that connects independent tutors with parents and students across Australia. Scholix provides:</p>
              <ul>
                <li>Scheduling and availability management tools</li>
                <li>Tutor verification and compliance infrastructure</li>
                <li>Communication and notification systems</li>
                <li>Payment and invoicing infrastructure</li>
                <li>Session management and progress tracking</li>
              </ul>
              <p>Scholix does not directly employ tutors. Tutors are independent contractors who set their own rates (within platform minimums), availability, and teaching methods. Scholix is not a party to any tutoring agreement between a tutor and a family.</p>
            </Section>

            <Section n="3" title="Eligibility">
              <p>You must be at least 18 years of age to create an account on Scholix. Students under 18 must be registered by a parent or legal guardian, who takes responsibility for the student's use of the platform. By registering, you confirm you meet these requirements and that all information you provide is accurate and current.</p>
            </Section>

            <Section n="4" title="Tutor Requirements and Independence">
              <p>All tutors registered on Scholix must:</p>
              <ul>
                <li>Hold a current, valid Working With Children Check (WWCC) issued in their state or territory as required by law</li>
                <li>Have an Australian Business Number (ABN) or operate as an individual contractor</li>
                <li>Provide accurate, up-to-date information about their qualifications, experience, and subject expertise</li>
                <li>Charge a minimum hourly rate of $65/hr as required by platform rules</li>
                <li>Meet all applicable safeguarding and child safety obligations under Australian law</li>
                <li>Maintain appropriate levels of professional conduct in all interactions with students and families</li>
                <li>Keep all tutor profile information current and accurate</li>
              </ul>
              <p>Tutors are responsible for their own tax obligations including income tax, GST (if applicable), and superannuation. Scholix does not withhold tax on behalf of tutors.</p>
              <p>Scholix reserves the right to suspend or remove tutor profiles where WWCC documents expire, qualifications cannot be verified, or conduct breaches these Terms.</p>
            </Section>

            <Section n="5" title="Commission and Payment System">
              <p>Scholix operates a tiered commission model based on each tutor's total completed sessions:</p>
              <ul>
                <li><strong>Starter</strong> (0–9 sessions): 30% platform fee</li>
                <li><strong>Growth</strong> (10–24 sessions): 25% platform fee</li>
                <li><strong>Established</strong> (25–49 sessions): 20% platform fee</li>
                <li><strong>Expert</strong> (50+ sessions): 15% platform fee</li>
              </ul>
              <p>Special 0% commission rules apply to a tutor's very first student (lifetime) and to any tutor's first completed session with a new student-tutor pairing.</p>
              <p><strong>Payment infrastructure (post-beta):</strong> Parents pay Scholix directly for sessions through our secure payment infrastructure. Scholix deducts the applicable platform commission and issues payouts to tutors according to the published payout schedule. Scholix may hold funds in trust pending session completion.</p>
              <p><strong>Beta period:</strong> During beta, payments are simulated. No real money is processed. Tutors and parents must arrange payment directly and outside the platform during this phase.</p>
              <p>Refunds, payment disputes and chargebacks may be handled by Scholix at our reasonable discretion. Tutors agree that commission deductions are final once a session is marked complete.</p>
            </Section>

            <Section n="6" title="Prohibited Conduct">
              <p>All users agree not to engage in any of the following:</p>
              <ul>
                <li><strong>Harassment or abuse:</strong> Threatening, intimidating, or harassing any other user</li>
                <li><strong>Discrimination:</strong> Treating any person less favourably based on race, gender, religion, disability, or any other protected attribute</li>
                <li><strong>Inappropriate communication:</strong> Sending unsolicited or sexually inappropriate messages to any user</li>
                <li><strong>Academic dishonesty:</strong> Completing, writing, or substantially assisting with graded assessments, exams, or assignments on behalf of students</li>
                <li><strong>Platform bypass:</strong> Soliciting or accepting payment for tutoring services outside Scholix in order to avoid platform fees, when the relationship originated through the platform</li>
                <li><strong>Data misuse:</strong> Using student information, contact details, or learning data for any purpose other than delivering tutoring services</li>
                <li><strong>Misrepresentation:</strong> Providing false or misleading information about qualifications, identity, or WWCC status</li>
                <li><strong>Impersonation:</strong> Posing as another tutor, parent, student, or Scholix staff member</li>
              </ul>
              <p>Violations may result in immediate account suspension, permanent ban, or referral to relevant authorities where conduct is illegal.</p>
            </Section>

            <Section n="7" title="Safety and Safeguarding">
              <p>The safety of children is a core commitment of Scholix. Users may report safety concerns through the platform or directly to us at <a href="mailto:support@scholix.com.au" className="text-primary hover:underline">support@scholix.com.au</a>.</p>
              <p>Scholix may investigate reported concerns and has the right to suspend accounts during any investigation. Where required by law, Scholix will cooperate with relevant authorities, including reporting mandatory safeguarding concerns.</p>
              <p>All tutors are reminded of their independent obligations as WWCC holders to report suspected child abuse or neglect under applicable state legislation.</p>
            </Section>

            <Section n="8" title="Intellectual Property">
              <p>All platform content, branding, technology, and materials created by Scholix remain our intellectual property. You may not copy, redistribute, or create derivative works from Scholix content without our prior written permission. You retain ownership of any content you create and upload, but grant Scholix a non-exclusive licence to use that content to provide platform services.</p>
            </Section>

            <Section n="9" title="Limitation of Liability">
              <p>Scholix provides infrastructure and tooling to connect tutors and families. While we take reasonable steps to verify tutors and maintain platform quality, Scholix does not guarantee the outcome of any tutoring engagement.</p>
              <p>To the extent permitted by Australian Consumer Law, Scholix's total liability to any user is limited to the value of fees paid to Scholix in the 3 months prior to the relevant claim. We do not exclude liability for personal injury, fraud, or any other matter where such exclusion is not permitted by law.</p>
            </Section>

            <Section n="10" title="Termination">
              <p>You may close your account at any time. Scholix may suspend or terminate your account if you breach these Terms, or for any other legitimate business reason, with or without notice where required to protect users or the platform. Obligations that arise before termination (such as outstanding payments) survive termination.</p>
            </Section>

            <Section n="11" title="Changes to Terms">
              <p>We may update these Terms from time to time. Where changes are material, we will notify registered users by email or in-app notification. Continued use of Scholix after the effective date of any update constitutes acceptance of the revised Terms.</p>
            </Section>

            <Section n="12" title="Governing Law">
              <p>These Terms are governed by the laws of Victoria, Australia. Any disputes are subject to the exclusive jurisdiction of the courts of Victoria.</p>
            </Section>

            <Section n="13" title="Contact Us">
              <p>For questions about these Terms, contact us at:</p>
              <ul>
                <li>General support: <a href="mailto:support@scholix.com.au" className="text-primary hover:underline">support@scholix.com.au</a></li>
                <li>Legal enquiries: <a href="mailto:legal@scholix.com.au" className="text-primary hover:underline">legal@scholix.com.au</a></li>
                <li>Privacy concerns: <a href="mailto:privacy@scholix.com.au" className="text-primary hover:underline">privacy@scholix.com.au</a></li>
              </ul>
            </Section>

          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/privacy" className="text-sm text-primary hover:underline">Privacy Policy</Link>
            <span className="text-gray-300">·</span>
            <Link href="/tutor-agreement" className="text-sm text-primary hover:underline">Tutor Agreement</Link>
            <span className="text-gray-300">·</span>
            <Link href="/tutor/code-of-conduct" className="text-sm text-primary hover:underline">Code of Conduct</Link>
            <span className="text-gray-300">·</span>
            <Link href="/signup" className="text-sm text-primary hover:underline">Create account</Link>
          </div>
        </div>
      </div>
    </>
  );
}
