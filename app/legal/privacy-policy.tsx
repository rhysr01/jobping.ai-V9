import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-black py-20 md:py-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="bg-white/5 rounded-2xl p-8 border border-white/10 shadow-lg">
          <h1 className="text-3xl md:text-4xl font-semibold text-white mb-8 tracking-tight">
            Privacy Policy
          </h1>
          
          <div className="bg-white/5 border border-white/10 p-4 rounded-lg mb-8">
            <p className="text-sm text-zinc-400">
              <strong className="text-white">Last Updated:</strong> {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="text-xl md:text-2xl font-semibold text-white mt-8 mb-4 tracking-tight">1. Information We Collect</h2>
              <p className="text-zinc-300 mb-4">We collect information you provide directly to us, including:</p>
              <ul className="list-disc pl-6 mb-6 text-zinc-300 space-y-1">
                <li>Name and email address</li>
                <li>Professional preferences and career goals</li>
                <li>Job search criteria and preferences</li>
                <li>Communication preferences</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl md:text-2xl font-semibold text-white mt-8 mb-4 tracking-tight">2. How We Use Your Information</h2>
              <p className="text-zinc-300 mb-4">We use the information we collect to:</p>
              <ul className="list-disc pl-6 mb-6 text-zinc-300 space-y-1">
                <li>Provide job matching services</li>
                <li>Send personalized job recommendations</li>
                <li>Improve our matching algorithms</li>
                <li>Communicate with you about our services</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl md:text-2xl font-semibold text-white mt-8 mb-4 tracking-tight">3. Information Sharing</h2>
              <p className="text-zinc-300 mb-6">
                We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl md:text-2xl font-semibold text-white mt-8 mb-4 tracking-tight">4. Data Security</h2>
              <p className="text-zinc-300 mb-6">
                We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
              </p>
            </section>

            <section>
              <h2 className="text-xl md:text-2xl font-semibold text-white mt-8 mb-4 tracking-tight">5. Your Rights</h2>
              <p className="text-zinc-300 mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 mb-6 text-zinc-300 space-y-1">
                <li>Access your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion of your data</li>
                <li>Opt-out of marketing communications</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl md:text-2xl font-semibold text-white mt-8 mb-4 tracking-tight">6. Data Retention</h2>
              <p className="text-zinc-300 mb-6">
                We retain your personal information for as long as necessary to provide our services and comply with legal obligations.
              </p>
            </section>

            <section>
              <h2 className="text-xl md:text-2xl font-semibold text-white mt-8 mb-4 tracking-tight">7. Cookies and Tracking</h2>
              <p className="text-zinc-300 mb-6">
                We use cookies and similar technologies to improve your experience and analyze usage patterns.
              </p>
            </section>

            <section>
              <h2 className="text-xl md:text-2xl font-semibold text-white mt-8 mb-4 tracking-tight">8. Changes to This Policy</h2>
              <p className="text-zinc-300 mb-6">
                We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.
              </p>
            </section>

            <section className="bg-white/5 border border-white/10 p-6 rounded-lg mt-8">
              <h3 className="text-xl font-semibold text-white mb-4 tracking-tight">Contact Us</h3>
              <p className="text-zinc-300 mb-4">
                If you have questions about this privacy policy or our data practices, please contact us at:
              </p>
              <p className="text-zinc-300 mb-2">
                <strong className="text-white">Email:</strong> privacy@jobping.ai
              </p>
              <p className="text-zinc-300 mb-2">
                <strong className="text-white">Data Deletion:</strong>{' '}
                <a 
                  href="/api/user/delete-data" 
                  className="text-white hover:text-zinc-300 underline decoration-white/20 underline-offset-4 hover:decoration-white/40 transition-colors"
                >
                  Request Data Deletion
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}