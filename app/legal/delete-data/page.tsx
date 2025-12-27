'use client';

import React, { useState } from 'react';

export default function DeleteDataPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/user/delete-data', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-csrf-token': 'jobping-request',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(' Your data has been successfully deleted. We\'re sorry to see you go!');
        setEmail('');
      } else {
        setError(result.error || 'Failed to delete data. Please contact support.');
      }
    } catch (err) {
      setError('An error occurred. Please try again or contact privacy@getjobping.com');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black py-20 md:py-28">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="bg-white/5 rounded-2xl p-8 border border-white/10 shadow-lg">
          <h1 className="text-3xl md:text-4xl font-semibold text-white mb-4 tracking-tight">
            Request Data Deletion
          </h1>
          
          <p className="text-zinc-300 mb-8">
            We respect your privacy. Enter your email address below to permanently delete all your data from JobPing.
          </p>

          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg mb-8">
            <p className="text-sm text-red-300">
              <strong className="text-red-200"> Warning:</strong> This action cannot be undone. All your preferences, matches, and account data will be permanently deleted.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your.email@example.com"
                className="w-full px-4 py-3 rounded-lg border-2 border-zinc-700 bg-zinc-900 text-white placeholder-zinc-500 focus:border-brand-500 focus:outline-none transition-colors"
              />
            </div>

            {message && (
              <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-lg">
                <p className="text-green-300">{message}</p>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg">
                <p className="text-red-300">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full px-6 py-4 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Deleting...' : 'Delete My Data'}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/10">
            <h3 className="text-lg font-semibold text-white mb-3">What gets deleted?</h3>
            <ul className="list-disc pl-6 text-zinc-300 space-y-1 text-sm">
              <li>Your account and profile information</li>
              <li>All job matches and recommendations</li>
              <li>Email tracking and engagement data</li>
              <li>All preferences and settings</li>
            </ul>
            
            <p className="text-xs text-zinc-400 mt-6">
              If you have questions, contact us at <a href="mailto:privacy@getjobping.com" className="text-brand-400 hover:text-brand-300 underline">privacy@getjobping.com</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

