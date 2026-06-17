import { Link } from "wouter";
import { ArrowLeft, BookOpen } from "lucide-react";
import TestModeBanner from "@/components/TestModeBanner";

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
                <p className="text-sm text-white/60 mt-0.5">Last updated: June 2026 · Version 1.0</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5 prose prose-sm max-w-none text-gray-700 leading-relaxed">

            <h2 className="text-base font-bold text-gray-900 mt-0">1. Information We Collect</h2>
            <p>We collect the following information when you use Scholix:</p>
            <ul>
              <li><strong>Account data:</strong> name, email address, phone number, role (tutor/parent/student)</li>
              <li><strong>Tutor data:</strong> WWCC number, WWCC expiry date, ABN, education details, documents uploaded for verification</li>
              <li><strong>Session data:</strong> booking details, subjects, payment records, progress notes</li>
              <li><strong>Usage data:</strong> login timestamps, pages visited, IP address at time of account creation</li>
            </ul>

            <h2 className="text-base font-bold text-gray-900">2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul>
              <li>Provide and improve the Scholix platform</li>
              <li>Verify tutor credentials (WWCC, qualifications)</li>
              <li>Facilitate bookings and session management</li>
              <li>Send notifications about sessions, payments and account status</li>
              <li>Comply with our legal obligations</li>
            </ul>

            <h2 className="text-base font-bold text-gray-900">3. WWCC and Sensitive Data</h2>
            <p>Working With Children Check (WWCC) numbers and expiry dates are stored securely and are <strong>only accessible to Scholix administrators</strong> for verification purposes. This information is never displayed publicly or shared with parents/students.</p>
            <p>Public tutor profiles show only a "WWCC Verified" badge — never the WWCC number or expiry date.</p>

            <h2 className="text-base font-bold text-gray-900">4. Data Sharing</h2>
            <p>We do not sell your personal data. We may share information:</p>
            <ul>
              <li>With tutors/parents to facilitate session bookings (name, phone for WhatsApp connection)</li>
              <li>With service providers who help operate the platform (database, email services)</li>
              <li>As required by Australian law</li>
            </ul>

            <h2 className="text-base font-bold text-gray-900">5. Data Retention</h2>
            <p>We retain your account data while your account is active and for 7 years after closure to comply with Australian tax and legal obligations. WWCC documents are retained during the verification period and for 12 months after expiry.</p>

            <h2 className="text-base font-bold text-gray-900">6. Your Rights</h2>
            <p>Under the Australian Privacy Act 1988, you have the right to:</p>
            <ul>
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your account data (subject to legal retention requirements)</li>
            </ul>

            <h2 className="text-base font-bold text-gray-900">7. Security</h2>
            <p>We use industry-standard security measures including encrypted storage, secure HTTPS connections, and role-based access controls. Passwords are hashed and never stored in plain text.</p>

            <h2 className="text-base font-bold text-gray-900">8. Contact</h2>
            <p>For privacy-related enquiries: <a href="mailto:privacy@scholix.com.au" className="text-primary hover:underline">privacy@scholix.com.au</a></p>
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
