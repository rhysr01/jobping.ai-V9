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
        <section className="py-20 md:py-24 bg-black">
          <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-white font-light text-xl md:text-2xl mb-8 tracking-wide leading-tight">
                What you'll get
              </h2>
            </div>
            
            <div className="max-w-2xl mx-auto">
              <div className="bg-[#0A0A0A] rounded-2xl p-6 md:p-8 border border-[#1A1A1A] shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                    <span className="text-black font-bold text-base">🎯</span>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg tracking-[-0.01em]">JobPing</h3>
                    <p className="text-[#666666] text-xs">Your job matches</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-[#111111] rounded-lg p-4 border border-[#1F1F1F]">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-white font-medium text-base">Frontend Developer</h4>
                      <span className="bg-white text-black px-2 py-1 rounded text-xs font-medium">94% match</span>
                    </div>
                    <p className="text-[#BBBBBB] text-sm mb-1">Adyen • Amsterdam, Netherlands</p>
                    <p className="text-[#777777] text-xs">Full-time • €45k-65k • React, TypeScript</p>
                  </div>
                  
                  <div className="bg-[#111111] rounded-lg p-4 border border-[#1F1F1F]">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-white font-medium text-base">Junior Product Manager</h4>
                      <span className="bg-white text-black px-2 py-1 rounded text-xs font-medium">87% match</span>
                    </div>
                    <p className="text-[#BBBBBB] text-sm mb-1">Spotify • Stockholm, Sweden</p>
                    <p className="text-[#777777] text-xs">Full-time • €40k-55k • Product, Analytics</p>
                  </div>
                  
                  <div className="bg-[#111111] rounded-lg p-4 border border-[#1F1F1F]">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-white font-medium text-base">Data Analyst Intern</h4>
                      <span className="bg-white text-black px-2 py-1 rounded text-xs font-medium">91% match</span>
                    </div>
                    <p className="text-[#BBBBBB] text-sm mb-1">Booking.com • Amsterdam, Netherlands</p>
                    <p className="text-[#777777] text-xs">Internship • €2k/month • Python, SQL</p>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-[#1F1F1F]">
                  <p className="text-[#666666] text-xs text-center">
                    Every 48 hours • 247+ graduates
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
        <section id="signup" className="py-20 md:py-24 bg-black relative">
          <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12">
            <Suspense fallback={
              <div className="text-center mb-8">
                <div className="h-8 bg-[#1A1A1A] rounded mb-4 animate-pulse max-w-md mx-auto"></div>
              </div>
            }>
              <SignupHeader />
            </Suspense>
            <div className="max-w-md mx-auto">
              {/* Enhanced loading state with skeleton matching form layout */}
              {!loaded && (
                <div className="bg-[#111111] p-8 md:p-10 rounded-2xl border border-[#1A1A1A] space-y-6 shadow-[0_0_40px_rgba(255,255,255,0.05)]">
                  <div className="space-y-4">
                    <div className="h-5 bg-[#1A1A1A] rounded animate-pulse"></div>
                    <div className="h-12 bg-[#1A1A1A] rounded-xl animate-pulse"></div>
                  </div>
                  <div className="space-y-4">
                    <div className="h-5 bg-[#1A1A1A] rounded w-3/4 animate-pulse"></div>
                    <div className="h-12 bg-[#1A1A1A] rounded-xl animate-pulse"></div>
                  </div>
                  <div className="space-y-4">
                    <div className="h-5 bg-[#1A1A1A] rounded w-1/2 animate-pulse"></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="h-12 bg-[#1A1A1A] rounded-xl animate-pulse"></div>
                      <div className="h-12 bg-[#1A1A1A] rounded-xl animate-pulse"></div>
                    </div>
                  </div>
                  <div className="h-14 bg-[#1A1A1A] rounded-xl animate-pulse mt-8"></div>
                </div>
              )}
              
              {/* Tally iframe or confirmation */}
              {formSubmitted ? (
                <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-8 text-center">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-white font-medium text-lg mb-2">Check your email</h3>
                  <p className="text-[#777777] text-sm">Verification link sent</p>
                </div>
              ) : (
                <iframe
                  className="h-[500px] md:h-[600px] w-full border-none focus-visible:ring-2 ring-white/10 rounded-xl"
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
