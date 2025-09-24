'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch('/api/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
        setUser(data.user);
        setMessage('Email verified successfully! Your account is now active.');
      } else {
        setStatus('error');
        setMessage(data.error || 'Verification failed');
      }
    } catch (error) {
      setStatus('error');
      setMessage('An error occurred during verification');
      console.error('Verification error:', error);
    }
  };

  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-6"></div>
          <h1 className="text-2xl font-bold text-white mb-4">Verifying Your Email...</h1>
          <p className="text-zinc-500">Please wait while we activate your account.</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-4">🎉 Welcome to JobPing!</h1>
          <p className="text-zinc-500 mb-6">{message}</p>
          
          {user && (
            <div className="bg-white/5 rounded-lg p-6 mb-6 text-left border border-white/10">
              <h2 className="text-lg font-semibold text-white mb-3">Your Profile is Active</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Name:</span>
                  <span className="text-white">{user.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Email:</span>
                  <span className="text-white">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Career Path:</span>
                  <span className="text-white capitalize">{user.career_path || 'Not specified'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Status:</span>
                  <span className="text-white/80">✅ Verified & Active</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
            <h3 className="text-white font-semibold mb-2">What's Next?</h3>
            <ul className="text-zinc-500 text-sm space-y-1 text-left">
              <li>📊 AI is analyzing your profile</li>
              <li>🔍 Finding your perfect job matches</li>
              <li>📧 First matches arriving tomorrow at 11:11 AM</li>
              <li>🎯 Expect 6-8 curated opportunities every 48 hours</li>
            </ul>
          </div>
          
          <Link 
            href="/"
            className="inline-block bg-white text-black px-6 py-3 rounded-lg font-semibold hover:bg-zinc-100 transition-colors"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="error-state rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-4">Verification Failed</h1>
        <p className="text-zinc-500 mb-6">{message}</p>
        
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
          <p className="text-zinc-500 text-sm">
            Common issues:
          </p>
          <ul className="text-zinc-400 text-sm mt-2 space-y-1">
            <li>• Link has expired (valid for 24 hours)</li>
            <li>• Email already verified</li>
            <li>• Invalid verification token</li>
          </ul>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-white text-black px-6 py-3 rounded-lg font-semibold hover:bg-zinc-100 transition-colors"
          >
            Try Again
          </button>
          
          <Link 
            href="/"
            className="block text-zinc-500 hover:text-white transition-colors"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
