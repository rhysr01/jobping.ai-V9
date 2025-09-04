import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 border-b-2 border-blue-600 pb-4">
            Privacy Policy
          </h1>
          
          <div className="bg-blue-50 p-4 rounded-lg mb-8">
            <p className="text-sm text-blue-800">
              <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="prose prose-lg max-w-none">
            <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">1. Information We Collect</h2>
            <p className="text-gray-700 mb-4">We collect information you provide directly to us, including:</p>
            <ul className="list-disc pl-6 mb-6 text-gray-700">
              <li>Name and email address</li>
              <li>Professional preferences and career goals</li>
              <li>Job search criteria and preferences</li>
              <li>Communication preferences</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">2. How We Use Your Information</h2>
            <p className="text-gray-700 mb-4">We use the information we collect to:</p>
            <ul className="list-disc pl-6 mb-6 text-gray-700">
              <li>Provide job matching services</li>
              <li>Send personalized job recommendations</li>
              <li>Improve our matching algorithms</li>
              <li>Communicate with you about our services</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">3. Information Sharing</h2>
            <p className="text-gray-700 mb-6">
              We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.
            </p>

            <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">4. Data Security</h2>
            <p className="text-gray-700 mb-6">
              We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
            </p>

            <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">5. Your Rights</h2>
            <p className="text-gray-700 mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 mb-6 text-gray-700">
              <li>Access your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your data</li>
              <li>Opt-out of marketing communications</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">6. Data Retention</h2>
            <p className="text-gray-700 mb-6">
              We retain your personal information for as long as necessary to provide our services and comply with legal obligations.
            </p>

            <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">7. Cookies and Tracking</h2>
            <p className="text-gray-700 mb-6">
              We use cookies and similar technologies to improve your experience and analyze usage patterns.
            </p>

            <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">8. Changes to This Policy</h2>
            <p className="text-gray-700 mb-6">
              We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.
            </p>

            <div className="bg-blue-50 p-6 rounded-lg mt-8">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Contact Us</h3>
              <p className="text-gray-700 mb-4">
                If you have questions about this privacy policy or our data practices, please contact us at:
              </p>
              <p className="text-gray-700 mb-2">
                <strong>Email:</strong> privacy@jobping.ai
              </p>
              <p className="text-gray-700 mb-2">
                <strong>Data Deletion:</strong>{' '}
                <a 
                  href="/api/user/delete-data" 
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Request Data Deletion
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}