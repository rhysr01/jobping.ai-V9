'use client';

import { useState, useEffect, Suspense, lazy } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import HowItWorks from './components/HowItWorks';
import Footer from './components/Footer';
import FAQ from './components/FAQ';

// Lazy load heavy components for better performance
const Features = lazy(() => import('./components/Features'));
const PriceSelector = lazy(() => import('./components/PriceSelector'));
const SignupHeader = lazy(() => import('./components/SignupHeader').then(module => ({ default: module.SignupHeader })));

export default function Home() {
  const [loaded, setLoaded] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Listen for Tally form submit events
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        if (event.origin === 'https://tally.so' && (event as any).data?.type === 'TALLY_FORM_SUBMIT') {
          setFormSubmitted(true);
        }
      } catch {
        // no-op
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Header />
      
      <main id="main-content" className="relative">
        {/* Hero Section */}
        <Hero />
        
        {/* How It Works Section */}
        <HowItWorks />

        {/* Features Section */}
        <Suspense fallback={
          <div className="py-20 md:py-28 bg-black">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
              <div className="grid md:grid-cols-3 gap-6">
                {[1,2,3].map(i => (
                  <div key={i} className="bg-[#111111] rounded-lg p-6 border border-[#1A1A1A]">
                    <div className="w-12 h-12 bg-[#1A1A1A] rounded-lg mb-4 animate-pulse"></div>
                    <div className="h-5 bg-[#1A1A1A] rounded mb-2 animate-pulse"></div>
                    <div className="h-4 bg-[#1A1A1A] rounded w-3/4 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        }>
          <Features />
        </Suspense>


        {/* Email Preview Section */}
        <section className="py-20 md:py-28 bg-black">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
            <div className="text-center mb-12">
              <h2 className="text-white font-semibold text-2xl md:text-3xl mb-4 tracking-[-0.01em]">
                See what you'll get
              </h2>
              <p className="text-[#888888] text-lg">
                Clean, personalized job matches delivered to your inbox daily
              </p>
            </div>
            
            <div className="max-w-2xl mx-auto">
              <div className="bg-[#111111] rounded-2xl p-8 border border-[#1A1A1A] shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                    <span className="text-black font-bold text-sm">🎯</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">JobPing</h3>
                    <p className="text-[#888888] text-sm">Your daily job matches</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-[#1A1A1A] rounded-lg p-4 border border-[#262626]">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-white font-medium">Frontend Developer</h4>
                      <span className="bg-white text-black px-2 py-1 rounded text-xs font-medium">94% match</span>
                    </div>
                    <p className="text-[#CCCCCC] text-sm mb-1">Adyen • Amsterdam, Netherlands</p>
                    <p className="text-[#888888] text-xs">Full-time • €45k-65k • React, TypeScript</p>
                  </div>
                  
                  <div className="bg-[#1A1A1A] rounded-lg p-4 border border-[#262626]">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-white font-medium">Junior Product Manager</h4>
                      <span className="bg-white text-black px-2 py-1 rounded text-xs font-medium">87% match</span>
                    </div>
                    <p className="text-[#CCCCCC] text-sm mb-1">Spotify • Stockholm, Sweden</p>
                    <p className="text-[#888888] text-xs">Full-time • €40k-55k • Product, Analytics</p>
                  </div>
                  
                  <div className="bg-[#1A1A1A] rounded-lg p-4 border border-[#262626]">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-white font-medium">Data Analyst Intern</h4>
                      <span className="bg-white text-black px-2 py-1 rounded text-xs font-medium">91% match</span>
                    </div>
                    <p className="text-[#CCCCCC] text-sm mb-1">Booking.com • Amsterdam, Netherlands</p>
                    <p className="text-[#888888] text-xs">Internship • €2k/month • Python, SQL</p>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-[#262626]">
                  <p className="text-[#888888] text-xs text-center">
                    Get 5-15 matches like these every day
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <Suspense fallback={
          <div className="py-20 md:py-28 bg-black">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
              <div className="grid md:grid-cols-2 gap-6">
                {[1,2].map(i => (
                  <div key={i} className="bg-[#111111] rounded-lg p-6 border border-[#1A1A1A]">
                    <div className="h-8 bg-[#1A1A1A] rounded mb-4 animate-pulse"></div>
                    <div className="h-12 bg-[#1A1A1A] rounded mb-4 animate-pulse"></div>
                    <div className="space-y-2">
                      {[1,2,3].map(j => (
                        <div key={j} className="h-4 bg-[#1A1A1A] rounded animate-pulse"></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        }>
          <PriceSelector />
        </Suspense>

        {/* Signup Section */}
        <section id="signup" className="section-cta bg-black relative">
          <div className="container-frame">
            <Suspense fallback={
              <div className="text-center mb-6">
                <div className="h-8 bg-[#1A1A1A] rounded-lg mb-4 animate-pulse max-w-md mx-auto"></div>
                <div className="h-6 bg-[#1A1A1A] rounded animate-pulse max-w-2xl mx-auto"></div>
              </div>
            }>
              <SignupHeader />
            </Suspense>
            <div className="max-w-md mx-auto">
              {/* Loading state while Tally iframe loads */}
              {!loaded && (
                <div className="bg-[#111111] p-6 rounded-lg border border-[#1A1A1A] flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-sm">Loading signup form...</p>
                  </div>
                </div>
              )}
              
              {/* Tally iframe or confirmation */}
              {formSubmitted ? (
                <div className="bg-[#111111] border border-[#1A1A1A] rounded-xl p-8 text-center shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-white font-bold text-xl mb-2">Registration Complete!</h3>
                  <p className="text-[#888888] mb-4">Check your email for verification link</p>
                  <div className="text-sm text-[#CCCCCC]">
                    Expected delivery: within 2 minutes
                  </div>
                </div>
              ) : (
                <iframe
                  className="h-[500px] w-full border-none focus-visible:ring-2 ring-white/20 rounded-lg"
                  src="https://tally.so/r/mJEqx4?alignLeft=1&transparentBackground=1&hideTitle=1"
                  data-testid="tally-iframe"
                  title="JobPing Signup Form"
                  aria-label="JobPing signup form"
                  onLoad={() => setLoaded(true)}
                  onError={() => setLoaded(true)}
                  style={{ display: loaded ? "block" : "none" }}
                  allow="clipboard-write; fullscreen"
                />
              )}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <FAQ />
      </main>

      <Footer />
    </div>
  );
}
