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

export default function PrivacyPolicy() {
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
                <h1 className="text-2xl font-extrabold text-white">Privacy Policy</h1>
                <p className="text-sm text-white/60 mt-0.5">Last updated: June 2026 · Version 2.0</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5 prose prose-sm max-w-none text-gray-700 leading-relaxed">

            <p className="text-sm text-gray-500 mb-6">Scholix Pty Ltd ("Scholix", "we", "us", "our") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, and share personal information when you use the Scholix platform. By using Scholix, you agree to the practices described here.</p>

            <Section n="1" title="Information We Collect">
              <p>We collect personal information necessary to operate the Scholix platform, including:</p>
              <p><strong>Account information:</strong> Your name, email address, phone number, date of birth (for students), password hash, and account role (tutor, parent, student, or admin).</p>
              <p><strong>Tutor verification information:</strong> Working With Children Check (WWCC) card number, expiry date, WWCC document uploads, Australian Business Number (ABN), educational qualifications and credentials, and verification status records.</p>
              <p><strong>Student learning information:</strong> Session history, progress notes recorded by tutors, subject areas, year level, and parent-reported identity information.</p>
              <p><strong>Booking and session data:</strong> Scheduled sessions, availability slots, cancellations, session outcomes, and completion records.</p>
              <p><strong>Payment records:</strong> Invoices, commission records, and payment simulation records. During beta, no real financial data is stored beyond invoice amounts.</p>
              <p><strong>Communications and notifications:</strong> In-app notifications, message history, and notification preferences.</p>
              <p><strong>Technical data:</strong> IP address, browser type, device type, access timestamps, and log data collected automatically when you use the platform.</p>
            </Section>

            <Section n="2" title="How We Use Your Information">
              <p>We use your personal information to:</p>
              <ul>
                <li>Create and manage your account</li>
                <li>Verify tutor credentials and process tutor approvals</li>
                <li>Facilitate session bookings between tutors and families</li>
                <li>Process payments and generate invoices (post-beta)</li>
                <li>Send booking confirmations, reminders, and platform notifications</li>
                <li>Monitor platform safety and investigate reported concerns</li>
                <li>Improve platform features and user experience</li>
                <li>Comply with our legal and regulatory obligations</li>
              </ul>
              <p>We do not use your personal information for unsolicited marketing without your consent.</p>
            </Section>

            <Section n="3" title="WWCC and Sensitive Verification Documents">
              <p>WWCC documents and verification materials are treated with heightened care:</p>
              <ul>
                <li>WWCC documents are only accessible by authorised Scholix administrators for the purpose of tutor verification</li>
                <li>WWCC documents are never publicly accessible or shared with parents, students, or other tutors</li>
                <li>Access to WWCC documents may be logged to provide an audit trail for compliance purposes</li>
                <li>Documents are retained for a reasonable period following tutor offboarding and then deleted according to our data retention schedule</li>
                <li>Administrators with document access are subject to confidentiality obligations</li>
              </ul>
            </Section>

            <Section n="4" title="Data Security">
              <p>We implement reasonable technical and organisational measures to protect your information:</p>
              <ul>
                <li><strong>Encryption in transit:</strong> All data transmitted between your device and Scholix servers is encrypted using TLS/HTTPS</li>
                <li><strong>Encryption at rest:</strong> Database data is encrypted at rest where supported by our infrastructure providers</li>
                <li><strong>Role-based access controls:</strong> Platform features and data access are restricted based on user role (tutor, parent, student, admin)</li>
                <li><strong>Access logging:</strong> Access to sensitive data, including tutor verification documents, is logged</li>
                <li><strong>Password security:</strong> Passwords are hashed using secure one-way hashing and are never stored in plain text</li>
              </ul>
              <p>No system is completely secure. If you suspect unauthorised access to your account, contact us immediately at <a href="mailto:support@scholix.com.au" className="text-primary hover:underline">support@scholix.com.au</a>.</p>
            </Section>

            <Section n="5" title="Third-Party Service Providers">
              <p>We may share your personal information with trusted third-party service providers who assist in operating the platform, including:</p>
              <ul>
                <li><strong>Database providers:</strong> Hosting and managing our PostgreSQL database infrastructure</li>
                <li><strong>Email providers:</strong> Sending transactional emails (e.g., Resend)</li>
                <li><strong>Payment providers:</strong> Processing payments post-beta (provider to be confirmed)</li>
                <li><strong>Cloud storage providers:</strong> Storing uploaded documents securely</li>
                <li><strong>Infrastructure providers:</strong> Hosting and delivering the Scholix web application</li>
              </ul>
              <p>We require all service providers to protect your information and only use it for the services they provide to us. We do not sell your personal information to any third party.</p>
            </Section>

            <Section n="6" title="Cookies and Tracking">
              <p>Scholix uses browser localStorage (not traditional cookies) to maintain your login session locally. We do not use third-party advertising trackers or analytics cookies. We may use basic server-side access logging for security and performance monitoring.</p>
            </Section>

            <Section n="7" title="Data Retention">
              <p>We retain your personal information for as long as your account is active or as required to provide services. If you delete your account, we will remove your personal information within a reasonable period, except where retention is required by law or legitimate business interests (such as invoice records and legal agreement records).</p>
              <p>Verification documents are retained for a period following tutor offboarding and then securely deleted.</p>
            </Section>

            <Section n="8" title="Your Rights">
              <p>Under Australian privacy law and as a matter of good practice, you have the right to:</p>
              <ul>
                <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                <li><strong>Correction:</strong> Ask us to correct inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information, subject to legal and business retention requirements</li>
                <li><strong>Complaints:</strong> Lodge a complaint with the Office of the Australian Information Commissioner (OAIC) if you believe we have breached the Privacy Act 1988</li>
              </ul>
              <p>To exercise any of these rights, contact us at <a href="mailto:privacy@scholix.com.au" className="text-primary hover:underline">privacy@scholix.com.au</a>.</p>
            </Section>

            <Section n="9" title="Children's Privacy">
              <p>Scholix allows parents to register student accounts on behalf of children under 18. Parents are responsible for supervising their child's use of the platform and consenting to the collection of their child's information. We do not knowingly collect information directly from children without parental consent.</p>
            </Section>

            <Section n="10" title="Changes to this Policy">
              <p>We may update this Privacy Policy from time to time. We will notify registered users of material changes by email or in-app notification. Continued use of Scholix after changes are posted constitutes acceptance of the updated Policy.</p>
            </Section>

            <Section n="11" title="Contact Us">
              <p>For privacy-related enquiries or to exercise your rights:</p>
              <ul>
                <li>Email: <a href="mailto:privacy@scholix.com.au" className="text-primary hover:underline">privacy@scholix.com.au</a></li>
                <li>General support: <a href="mailto:support@scholix.com.au" className="text-primary hover:underline">support@scholix.com.au</a></li>
              </ul>
            </Section>

          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/terms" className="text-sm text-primary hover:underline">Terms of Service</Link>
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
