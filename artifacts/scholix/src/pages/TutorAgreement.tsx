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
                <p className="text-sm text-white/60 mt-0.5">Last updated: June 2026 · Version 2.0</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
            <p className="text-sm font-semibold text-amber-800">For tutors only</p>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">This agreement applies to all tutors registered on Scholix and is in addition to the general Terms of Service. By completing the onboarding process and submitting your profile for verification, you agree to this agreement.</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5">
            <p className="text-sm font-semibold text-blue-800">Beta Platform Notice</p>
            <p className="text-xs text-blue-700 mt-1 leading-relaxed">Scholix is currently in beta. Payments are simulated — no real financial transactions are processed at this time. During beta, you may arrange direct payment with families. This agreement also covers the post-beta payment model described in Section 5.</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5 prose prose-sm max-w-none text-gray-700 leading-relaxed">

            <Section n="1" title="Independent Contractor Status">
              <p>You are an independent contractor, not an employee, partner, or agent of Scholix. This means:</p>
              <ul>
                <li>You are responsible for all income tax obligations arising from your tutoring income, including lodging your own tax returns with the ATO</li>
                <li>You are responsible for superannuation contributions where applicable under Australian law</li>
                <li>You are responsible for obtaining your own professional indemnity and public liability insurance if you require it</li>
                <li>You set your own rates (subject to the platform minimum of $50/hr), availability, and teaching approach</li>
                <li>Scholix does not direct or control the content or delivery of your tutoring sessions</li>
              </ul>
              <p>If you hold or are required to hold an ABN, you are responsible for maintaining it and meeting your GST obligations if your tutoring income exceeds $75,000 per year.</p>
            </Section>

            <Section n="2" title="Tutor Responsibilities">
              <p>As a tutor on Scholix, you commit to:</p>
              <ul>
                <li><strong>Accurate profile:</strong> Keep your profile information current, including qualifications, subjects, bio, and WWCC status</li>
                <li><strong>Preparation:</strong> Arrive (or connect virtually) to each session prepared with appropriate materials for the student's level and subject</li>
                <li><strong>Quality tutoring:</strong> Deliver tutoring sessions to a professional standard and in the best educational interests of your student</li>
                <li><strong>Progress notes:</strong> Record meaningful progress notes after sessions to help families track student development</li>
                <li><strong>Punctuality:</strong> Honour scheduled session times or provide reasonable notice of changes or cancellations</li>
                <li><strong>Confidentiality:</strong> Keep all student information strictly confidential and use it only for delivering tutoring services</li>
                <li><strong>Safeguarding:</strong> Comply with all obligations under your WWCC and applicable state child safety legislation at all times</li>
              </ul>
            </Section>

            <Section n="3" title="Academic Integrity">
              <p>Scholix is committed to genuine learning outcomes. As a tutor, you must not:</p>
              <ul>
                <li>Complete, write, or substantially author any graded assignment, assessment, or examination on behalf of a student</li>
                <li>Assist a student in deceiving their school, university, or educational institution about the authorship of their work</li>
                <li>Misrepresent a student's abilities or achievements to a parent, school, or institution</li>
                <li>Encourage or enable any form of academic dishonesty</li>
              </ul>
              <p>Supporting a student to understand content, practice skills, and develop their own answers is encouraged. Completing work for them is not.</p>
            </Section>

            <Section n="4" title="Communication Rules">
              <p>All communication between tutors, parents, and students through Scholix must be:</p>
              <ul>
                <li>Professional, respectful, and appropriate at all times</li>
                <li>Relevant to the tutoring relationship and educational needs of the student</li>
                <li>Conducted within the platform or via channels agreed with the family</li>
              </ul>
              <p>Tutors must not:</p>
              <ul>
                <li>Request private contact details from students or minors for personal communication</li>
                <li>Attempt to move client relationships off the Scholix platform to avoid platform fees when the relationship originated through Scholix</li>
                <li>Communicate with students or families in any manner that is inappropriate, sexual, threatening, or discriminatory</li>
              </ul>
            </Section>

            <Section n="5" title="Payment and Commission">
              <p><strong>Post-beta payment model:</strong> Parents pay Scholix for sessions through our payment infrastructure. Scholix deducts the applicable platform commission (see Tier structure in the Terms of Service) and issues payouts to tutors. Tutors acknowledge that commission is deducted before payout and that completed session invoices are final.</p>
              <p><strong>Beta period:</strong> During the current beta phase, payments are simulated. Parents and tutors may arrange direct payment during this time.</p>
              <p><strong>Tier progression:</strong> Your commission rate decreases as you accumulate commission-paying completed sessions (30% → 24% → 15% → 5%). Commission-free sessions (first student, first session with any new student) do not count towards tier advancement.</p>
              <p><strong>Special commission-free rules:</strong> Your first student relationship is permanently commission-free (0%). The first completed session with any new student-tutor pairing is also commission-free.</p>
            </Section>

            <Section n="6" title="Tutor Growth and Earnings">
              <p>Scholix is designed to help tutors build sustainable tutoring businesses, not just fill a calendar. You can grow your income by:</p>
              <ul>
                <li>Completing more sessions to progress through commission tiers and keep a higher percentage of each session</li>
                <li>Building strong student relationships that lead to ongoing bookings and referrals</li>
                <li>Maintaining high ratings and detailed progress notes that attract new parents</li>
                <li>Expanding your subject offering into high-demand areas</li>
                <li>Exploring group session opportunities as the platform grows</li>
                <li>Completing Scholix Academy modules to improve your teaching and business skills</li>
              </ul>
              <p>Scholix Academy provides free educational content on tax basics, pricing strategy, student acquisition, and professional tutoring development.</p>
            </Section>

            <Section n="7" title="Verification and Compliance">
              <p>Tutors must:</p>
              <ul>
                <li>Submit a current WWCC card and relevant education documents during onboarding</li>
                <li>Notify Scholix immediately if their WWCC expires, is cancelled, or is subject to review</li>
                <li>Maintain accurate ABN records and comply with ATO obligations</li>
              </ul>
              <p>Scholix may periodically request updated compliance documentation. Failure to provide current documents may result in profile suspension until compliance is confirmed.</p>
            </Section>

            <Section n="8" title="Suspension and Termination">
              <p>Scholix may immediately suspend or permanently remove a tutor profile without notice in any of the following circumstances:</p>
              <ul>
                <li>WWCC expiry, cancellation, or negative outcome</li>
                <li>Fraudulent, deceptive, or misleading conduct</li>
                <li>Serious misconduct toward a student, parent, or other user</li>
                <li>Any safety concern relating to a child or student</li>
                <li>Breach of the academic integrity obligations in Section 3</li>
                <li>Persistent non-compliance with platform standards despite notice</li>
              </ul>
              <p>Tutors may also terminate their participation at any time by contacting support. Outstanding obligations (including any unpaid platform fees) survive termination.</p>
            </Section>

            <Section n="9" title="Changes to This Agreement">
              <p>Scholix may update this agreement from time to time. Material changes will be communicated by email or in-app notification. Continued use of the platform after the effective date constitutes acceptance.</p>
            </Section>

            <Section n="10" title="Contact">
              <ul>
                <li>Support: <a href="mailto:support@scholix.com.au" className="text-primary hover:underline">support@scholix.com.au</a></li>
                <li>Legal: <a href="mailto:legal@scholix.com.au" className="text-primary hover:underline">legal@scholix.com.au</a></li>
              </ul>
            </Section>

          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/terms" className="text-sm text-primary hover:underline">Terms of Service</Link>
            <span className="text-gray-300">·</span>
            <Link href="/privacy" className="text-sm text-primary hover:underline">Privacy Policy</Link>
            <span className="text-gray-300">·</span>
            <Link href="/tutor/code-of-conduct" className="text-sm text-primary hover:underline">Code of Conduct</Link>
          </div>
        </div>
      </div>
    </>
  );
}
