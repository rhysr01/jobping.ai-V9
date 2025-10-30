import React from 'react';

export default function UnsubscribePage() {
  return (
    <div className="min-h-screen bg-black py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-glass-default border border-border-default shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-white mb-8 border-b border-border-subtle pb-4">
            Unsubscribe & Email Preferences
          </h1>
          
          <div className="bg-glass-subtle p-4 rounded-lg mb-8 border border-border-subtle">
            <p className="text-sm text-white/80">
              <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="prose prose-lg max-w-none">
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Manage Your Email Preferences</h2>
            <p className="text-white/80 mb-6">
              We respect your privacy and give you control over the emails you receive from JobPing.
            </p>

            <div className="bg-glass-subtle border-l-4 border-border-elevated p-4 mb-6 border border-border-subtle">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-white/60" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-white/80">
                    <strong>Important:</strong> Unsubscribing from all emails will prevent you from receiving job recommendations and important service updates.
                  </p>
                </div>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-white mt-8 mb-4">Email Categories</h3>
            <div className="space-y-4 mb-8">
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-white">Job Recommendations</h4>
                    <p className="text-sm text-white/70">Personalized job matches based on your profile</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-white/20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-white/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white/30 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Service Updates</h4>
                    <p className="text-sm text-gray-600">Important updates about JobPing features and policies</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-white/20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-white/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white/30 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Marketing & Promotions</h4>
                    <p className="text-sm text-gray-600">Special offers and promotional content</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-white/20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-white/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white/30 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">Unsubscribe Options</h3>
            <div className="space-y-4 mb-8">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-900 mb-2">Unsubscribe from All Emails</h4>
                <p className="text-sm text-red-700 mb-4">
                  This will stop all emails from JobPing, including job recommendations and important service updates.
                </p>
                <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                  Unsubscribe from All
                </button>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Unsubscribe from Specific Category</h4>
                <p className="text-sm text-gray-700 mb-4">
                  Use the toggles above to unsubscribe from specific email categories while keeping others active.
                </p>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">Resubscribe</h3>
            <p className="text-gray-700 mb-6">
              If you change your mind, you can always resubscribe to our emails by:
            </p>
            <ul className="list-disc pl-6 mb-6 text-gray-700">
              <li>Updating your email preferences in your account settings</li>
              <li>Contacting our support team</li>
              <li>Re-engaging with our service</li>
            </ul>

            <div className="bg-blue-50 p-6 rounded-lg mt-8">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Contact Us</h3>
              <p className="text-gray-700 mb-4">
                If you have questions about unsubscribing or need help managing your email preferences:
              </p>
              <p className="text-gray-700 mb-2">
                <strong>Email:</strong> support@getjobping.com
              </p>
              <p className="text-gray-700 mb-2">
                <strong>Data Deletion:</strong>{' '}
                <a 
                  href="/api/user/delete-data" 
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Request Complete Data Deletion
                </a>
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                <strong>Note:</strong> Processing unsubscribe requests may take up to 48 hours. You may still receive emails during this period.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
