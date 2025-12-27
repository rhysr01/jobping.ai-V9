'use client';

import { SignupFormFree } from '@/components/signup/SignupFormFree';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function FreeSignupPage() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-black py-16">
        <div className="container max-w-2xl mx-auto px-4">
          <SignupFormFree />
        </div>
      </div>
    </ErrorBoundary>
  );
}

