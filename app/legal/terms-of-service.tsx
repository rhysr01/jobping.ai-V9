import React from 'react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-black py-20 md:py-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="bg-white/5 rounded-2xl p-8 border border-white/10 shadow-lg">
          <h1 className="text-3xl md:text-4xl font-semibold text-white mb-8 tracking-tight">
            Terms of Service
          </h1>
          
          <div className="bg-white/5 border border-white/10 p-4 rounded-lg mb-8">
            <p className="text-sm text-zinc-400">
              <strong className="text-white">Last Updated:</strong> {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="text-xl md:text-2xl font-semibold text-white mt-8 mb-4 tracking-tight">1. Acceptance of Terms</h2>
              <p className="text-zinc-300 mb-6">
                By accessing and using JobPing, you accept and agree to be bound by the terms and provision of this agreement.
              </p>
            </section>

            <section>
              <h2 className="text-xl md:text-2xl font-semibold text-white mt-8 mb-4 tracking-tight">2. Description of Service</h2>
              <p className="text-zinc-300 mb-6">
                JobPing provides AI-powered job matching services to help students and recent graduates find relevant career opportunities.
              </p>
            </section>

            <section>
              <h2 className="text-xl md:text-2xl font-semibold text-white mt-8 mb-4 tracking-tight">3. User Accounts</h2>
              <p className="text-zinc-300 mb-4">You are responsible for:</p>
              <ul className="list-disc pl-6 mb-6 text-zinc-300 space-y-1">
                <li>Maintaining the confidentiality of your account</li>
                <li>All activities that occur under your account</li>
                <li>Providing accurate and complete information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl md:text-2xl font-semibold text-white mt-8 mb-4 tracking-tight">4. Acceptable Use</h2>
              <p className="text-zinc-300 mb-4">You agree not to:</p>
              <ul className="list-disc pl-6 mb-6 text-zinc-300 space-y-1">
                <li>Use the service for any unlawful purpose</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with the service or other users</li>
                <li>Share false or misleading information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl md:text-2xl font-semibold text-white mt-8 mb-4 tracking-tight">5. Privacy</h2>
              <p className="text-zinc-300 mb-6">
                Your privacy is important to us. Please review our{' '}
                <a href="/legal/privacy-policy" className="text-white hover:text-zinc-300 underline decoration-white/20 underline-offset-4 hover:decoration-white/40 transition-colors">
                  Privacy Policy
                </a>{' '}
                to understand our practices.
              </p>
            </section>

            <section>
              <h2 className="text-xl md:text-2xl font-semibold text-white mt-8 mb-4 tracking-tight">6. Intellectual Property</h2>
              <p className="text-zinc-300 mb-6">
                The service and its original content, features, and functionality are owned by JobPing and are protected by international copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl md:text-2xl font-semibold text-white mt-8 mb-4 tracking-tight">7. Termination</h2>
              <p className="text-zinc-300 mb-6">
                We may terminate or suspend your account immediately, without prior notice, for any reason, including breach of these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl md:text-2xl font-semibold text-white mt-8 mb-4 tracking-tight">8. Limitation of Liability</h2>
              <p className="text-zinc-300 mb-6">
                JobPing shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.
              </p>
            </section>

            <section>
              <h2 className="text-xl md:text-2xl font-semibold text-white mt-8 mb-4 tracking-tight">9. Changes to Terms</h2>
              <p className="text-zinc-300 mb-6">
                We reserve the right to modify these terms at any time. We will notify users of any material changes.
              </p>
            </section>

            <section>
              <h2 className="text-xl md:text-2xl font-semibold text-white mt-8 mb-4 tracking-tight">10. Governing Law</h2>
              <p className="text-zinc-300 mb-6">
                These terms shall be governed by and construed in accordance with the laws of Ireland.
              </p>
            </section>

            <section className="bg-white/5 border border-white/10 p-6 rounded-lg mt-8">
              <h3 className="text-xl font-semibold text-white mb-4 tracking-tight">Contact Us</h3>
              <p className="text-zinc-300 mb-4">
                If you have questions about these terms, please contact us at:
              </p>
              <p className="text-zinc-300 mb-2">
                <strong className="text-white">Email:</strong> legal@getjobping.com
              </p>
              <p className="text-zinc-300 mb-2">
                <strong className="text-white">Address:</strong> [Your Business Address]
              </p>
              <p className="text-sm text-zinc-500 mt-4">
                Note: Please update the business address above with your actual business address.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}