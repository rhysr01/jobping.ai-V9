'use client';

import { useState, Suspense, lazy } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import HowItWorks from './components/HowItWorks';
import Footer from './components/Footer';
import { JobCardSkeleton } from './components/JobCardSkeleton';
import FAQ from './components/FAQ';
import Comparison from './components/Comparison';

// Lazy load heavy components for better performance
const Features = lazy(() => import('./components/Features'));
const JobCard = lazy(() => import('./components/JobCard').then(module => ({ default: module.JobCard })));
const PriceSelector = lazy(() => import('./components/PriceSelector'));
const SignupHeader = lazy(() => import('./components/SignupHeader').then(module => ({ default: module.SignupHeader })));

export default function Home() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="min-h-screen bg-[#0B0B0F] relative overflow-hidden">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Header />
      
      <main id="main-content" className="relative">
        {/* Hero Section */}
        <Hero />
        
        {/* How It Works Section */}
        <HowItWorks />
        
        {/* Gmail Job Preview Section */}
        <section id="preview" className="section-content bg-[#0B0B0F] relative">
          <Suspense fallback={<JobCardSkeleton />}>
            <JobCard index={0} />
          </Suspense>
        </section>

        {/* Features Section */}
        <Suspense fallback={
          <div className="section-content text-center">
            <div className="h-8 bg-[#374151] rounded-lg mb-4 animate-pulse max-w-md mx-auto"></div>
            <div className="h-6 bg-[#374151] rounded animate-pulse max-w-2xl mx-auto"></div>
          </div>
        }>
          <Features />
        </Suspense>

        {/* Comparison Section */}
        <Comparison />

        {/* Pricing Section */}
        <Suspense fallback={
          <div className="section-content text-center">
            <div className="h-8 bg-[#374151] rounded-lg mb-4 animate-pulse max-w-md mx-auto"></div>
            <div className="h-6 bg-[#374151] rounded animate-pulse max-w-2xl mx-auto"></div>
          </div>
        }>
          <PriceSelector />
        </Suspense>

        {/* FAQ Section */}
        <FAQ />

        {/* Signup Section */}
        <section id="signup" className="section-cta bg-[#0B0B0F] relative">
          <div className="container-frame">
            <Suspense fallback={
              <div className="text-center mb-6">
                <div className="h-8 bg-[#374151] rounded-lg mb-4 animate-pulse max-w-md mx-auto"></div>
                <div className="h-6 bg-[#374151] rounded animate-pulse max-w-2xl mx-auto"></div>
              </div>
            }>
              <SignupHeader />
            </Suspense>
            <div className="max-w-md mx-auto">
              {/* Loading state while Tally iframe loads */}
              {!loaded && (
                <div className="bg-white/5 p-6 rounded-lg border border-white/10 flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-sm">Loading signup form...</p>
                  </div>
                </div>
              )}
              
              {/* Tally iframe - simplified single form approach */}
              <iframe
                className="h-[500px] w-full border-none focus-visible:ring-2 ring-white/20 rounded-lg"
                src="https://tally.so/r/mJEqx4?alignLeft=1&transparentBackground=1&hideTitle=1"
                data-testid="tally-iframe"
                title="JobPing Signup Form"
                aria-label="JobPing signup form"
                onLoad={() => setLoaded(true)}
                style={{ display: loaded ? "block" : "none" }}
              />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
