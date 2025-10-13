'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { logUserAction } from '@/lib/monitoring';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error for monitoring
    logUserAction('error_boundary_triggered', {
      error: error.message,
      digest: error.digest,
      stack: error.stack,
    });
    console.error('Error boundary caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="max-w-md w-full p-8 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Something went wrong
          </h2>
          <p className="text-zinc-400">
            We've been notified and are looking into it.
          </p>
        </div>
        
        <button
          onClick={reset}
          className="w-full bg-gradient-to-r from-brand-500 to-purple-600 hover:scale-105 text-white font-semibold py-3 px-6 rounded-xl transition-transform"
        >
          Try again
        </button>
        
        <Link
          href="/"
          className="block w-full mt-3 text-center text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}

