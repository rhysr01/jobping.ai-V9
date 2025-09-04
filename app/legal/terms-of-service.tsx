import React from 'react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 border-b-2 border-blue-600 pb-4">
            Terms of Service
          </h1>
          
          <div className="bg-blue-50 p-4 rounded-lg mb-8">
            <p className="text-sm text-blue-800">
              <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="prose prose-lg max-w-none">
            <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 mb-6">
              By accessing and using JobPing, you accept and agree to be bound by the terms and provision of this agreement.
            </p>

            <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">2. Description of Service</h2>
            <p className="text-gray-700 mb-6">
              JobPing provides AI-powered job matching services to help students and recent graduates find relevant career opportunities.
            </p>

            <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">3. User Accounts</h2>
            <p className="text-gray-700 mb-4">You are responsible for:</p>
            <ul className="list-disc pl-6 mb-6 text-gray-700">
              <li>Maintaining the confidentiality of your account</li>
              <li>All activities that occur under your account</li>
              <li>Providing accurate and complete information</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">4. Acceptable Use</h2>
            <p className="text-gray-700 mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 mb-6 text-gray-700">
              <li>Use the service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with the service or other users</li>
              <li>Share false or misleading information</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">5. Privacy</h2>
            <p className="text-gray-700 mb-6">
              Your privacy is important to us. Please review our{' '}
              <a href="/privacy-policy" className="text-blue-600 hover:text-blue-800 underline">
                Privacy Policy
              </a>{' '}
              to understand our practices.
            </p>

            <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">6. Intellectual Property</h2>
            <p className="text-gray-700 mb-6">
              The service and its original content, features, and functionality are owned by JobPing and are protected by international copyright, trademark, and other intellectual property laws.
            </p>

            <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">7. Termination</h2>
            <p className="text-gray-700 mb-6">
              We may terminate or suspend your account immediately, without prior notice, for any reason, including breach of these Terms.
            </p>

            <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">8. Limitation of Liability</h2>
            <p className="text-gray-700 mb-6">
              JobPing shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.
            </p>

            <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">9. Changes to Terms</h2>
            <p className="text-gray-700 mb-6">
              We reserve the right to modify these terms at any time. We will notify users of any material changes.
            </p>

            <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">10. Governing Law</h2>
            <p className="text-gray-700 mb-6">
              These terms shall be governed by and construed in accordance with the laws of Ireland.
            </p>

            <div className="bg-blue-50 p-6 rounded-lg mt-8">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Contact Us</h3>
              <p className="text-gray-700 mb-4">
                If you have questions about these terms, please contact us at:
              </p>
              <p className="text-gray-700 mb-2">
                <strong>Email:</strong> legal@jobping.ai
              </p>
              <p className="text-gray-700 mb-2">
                <strong>Address:</strong> [Your Business Address]
              </p>
              <p className="text-sm text-gray-600 mt-4">
                Note: Please update the business address above with your actual business address.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}