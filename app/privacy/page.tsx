'use client';

export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen bg-black py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-5xl font-black mb-8 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Privacy Policy
        </h1>
        
        <div className="prose prose-invert max-w-none text-gray-300 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
            <p>
              aischool365 ("we," "us," "our," or "Company") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Personal Information</h3>
                <p>
                  We may collect personal information such as name, email address, phone number, school affiliation, and other details you provide when registering, creating a profile, or communicating with us.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Usage Information</h3>
                <p>
                  We collect information about how you interact with our platform, including pages visited, time spent, features used, and learning progress data.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Device Information</h3>
                <p>
                  We may collect information about your device, including IP address, browser type, operating system, and device identifiers.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. How We Use Your Information</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>To provide, maintain, and improve our services</li>
              <li>To personalize your learning experience</li>
              <li>To send administrative information and updates</li>
              <li>To respond to your inquiries</li>
              <li>To analyze usage patterns and improve our platform</li>
              <li>To comply with legal obligations</li>
              <li>To prevent fraud and ensure platform security</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Data Protection & Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information. This includes encryption, secure servers, and restricted access controls. However, no method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Student Data Privacy (FERPA & COPPA)</h2>
            <p>
              We comply with the Family Educational Rights and Privacy Act (FERPA) and the Children's Online Privacy Protection Act (COPPA). Student educational records and data are treated with the highest level of confidentiality and security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. GDPR Compliance</h2>
            <p>
              For users in the European Union, we comply with the General Data Protection Regulation (GDPR). You have the right to access, correct, delete, or port your personal data. To exercise these rights, please contact us at privacy@aischool365.com.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Third-Party Sharing</h2>
            <p>
              We do not sell, trade, or rent your personal information to third parties. We may share information only with:
            </p>
            <ul className="space-y-2 list-disc list-inside mt-2">
              <li>Service providers who assist in operating our platform</li>
              <li>Legal authorities when required by law</li>
              <li>Your institution if you are a student or teacher</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Your Privacy Rights</h2>
            <p>
              You have the right to:
            </p>
            <ul className="space-y-2 list-disc list-inside mt-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your data</li>
              <li>Opt-out of marketing communications</li>
              <li>Data portability</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Cookies & Tracking</h2>
            <p>
              We use cookies and similar technologies to enhance your experience. You can control cookie preferences through your browser settings. We do not use tracking for advertising purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Children's Privacy</h2>
            <p>
              aischool365 is designed for educational institutions. We comply with COPPA and do not knowingly collect information from children without appropriate parental/guardian consent and school authorization.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">11. Policy Changes</h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated date. Your continued use constitutes acceptance of changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">12. Contact Us</h2>
            <p>
              For privacy-related questions or concerns, contact us at:
            </p>
            <p className="mt-2">
              Email: privacy@aischool365.com<br />
              Address: aischool365 Privacy Team
            </p>
          </section>

          <p className="text-sm text-gray-500 mt-12">
            Last updated: May 2026
          </p>
        </div>
      </div>
    </div>
  );
}
