'use client';

import React, { useState } from 'react';

// Analytics tracking
const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, properties);
  }
  // Fallback for other analytics providers
  console.log('Analytics:', eventName, properties);
};

export default function JobPingPro() {
  const [billing, setBilling] = useState('monthly');

  return (
    <div id="main" className="min-h-screen text-white antialiased">
      {/* Clean background - no patterns */}
      
      {/* HEADER - Responsive with details menu */}
      <header className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="container-x h-16 flex items-center justify-between">
          {/* Brand mark removed as requested. Clean header only. */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm subtle hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded px-2 py-1">Features</a>
            <a href="#preview"  className="text-sm subtle hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded px-2 py-1">Preview</a>
            <a href="#pricing"  className="text-sm subtle hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded px-2 py-1">Pricing</a>
          </nav>
          {/* Right: CTA + mobile menu */}
          <div className="flex items-center gap-3">
            <a href="#signup" className="btn btn-primary hidden sm:inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black" onClick={() => trackEvent('hero_cta_click', { location: 'header' })}>Start Free</a>
            <details className="relative md:hidden">
              <summary className="list-none btn btn-ghost px-3 py-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
                <svg aria-hidden className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="1.25" d="M4 6h16M4 12h16M4 18h16"/></svg>
                <span className="sr-only">Menu</span>
              </summary>
              <div className="absolute right-0 mt-2 w-48 card p-2">
                <a href="#features" className="block px-3 py-3 rounded-lg hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 min-h-[44px] flex items-center">Features</a>
                <a href="#preview"  className="block px-3 py-3 rounded-lg hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 min-h-[44px] flex items-center">Preview</a>
                <a href="#pricing"  className="block px-3 py-3 rounded-lg hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 min-h-[44px] flex items-center">Pricing</a>
                <a href="#signup"   className="block px-3 py-3 rounded-lg hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 min-h-[44px] flex items-center">Start Free</a>
              </div>
            </details>
          </div>
        </div>
      </header>

      {/* HERO - Clean, spacious, centered */}
      <section className="relative section-y">
        <div className="container-x text-center px-4 sm:px-6">
          <div className="kicker mb-6">Early-career job matches</div>
          
          <div className="text-[clamp(4rem,8vw,8rem)] leading-[0.95] font-semibold tracking-tight mb-4">
            JobPing
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-4">
            Personalised roles, delivered daily to your inbox.
          </h1>
          <p className="text-lg md:text-xl muted max-w-[55ch] mx-auto">
            Weekly job matches for early-career roles across Europe.
          </p>
          
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#signup" className="btn btn-primary px-8 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black min-h-[44px]" onClick={() => trackEvent('hero_cta_click', { location: 'hero' })}>Get 5 jobs/day free</a>
            <a href="/sample-email.html" target="_blank" rel="noopener" className="btn btn-ghost px-8 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black min-h-[44px]" onClick={() => trackEvent('sample_email_click', { location: 'hero' })}>View a sample email</a>
          </div>
          <p className="text-sm subtle mt-6">GDPR-friendly · Email-only · Unsubscribe anytime</p>
        </div>
        
        {/* add background indigo bubbles */}
        <div className="bg-orb bg-orb--tl" aria-hidden />
        <div className="bg-orb bg-orb--br" aria-hidden />
      </section>
      
      {/* Skip to pricing anchor */}
      <a href="#pricing" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-1/2 focus:-translate-x-1/2 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded-lg focus:font-semibold">
        Skip to pricing
      </a>

      {/* PRODUCT PREVIEW - Visual proof */}
      <section id="preview" className="section-y">
        <div className="container-x">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-6">Sample email</h2>
          <p className="subtle mb-6">5 relevant roles, delivered at 7:00 AM daily.</p>
          <div className="card p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-white/10 border border-white/20 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">See exactly what you'll receive</h3>
              <p className="muted">Real email template with 5 personalized job matches</p>
            </div>
            <a 
              href="/sample-email.html" 
              target="_blank" 
              rel="noopener"
              className="btn btn-primary px-8 py-4 text-lg"
            >
              View Sample Email
            </a>
          </div>
        </div>
      </section>

      {/* PRICING - Premium cards */}
      <section id="pricing" className="section-y">
        <div className="container-x">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Pricing that makes sense</h2>
            <p className="muted mt-2">Start free. Upgrade when you're ready.</p>
            
            {/* Billing toggle */}
            <div className="inline-flex items-center p-1 bg-white/[0.05] rounded-xl border border-white/[0.08] mt-8">
              <button onClick={() => setBilling('monthly')} className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all ${ 
                billing === 'monthly' 
                  ? 'bg-white/[0.1] text-white shadow-lg' 
                  : 'subtle hover:text-white'
              }`}>
                Monthly
              </button>
              <button onClick={() => setBilling('quarterly')} className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all ${ 
                billing === 'quarterly' 
                  ? 'bg-white/[0.1] text-white shadow-lg' 
                  : 'subtle hover:text-white'
              }`}>
                Quarterly
                <span className="ml-2 text-xs text-white/80 font-bold">-33%</span>
              </button>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Free tier */}
            <div className="card p-8">
              <div className="flex items-center justify-between">
                <span className="px-2 py-1 bg-white/[0.06] text-white/80 text-[12px] font-bold rounded-md border border-white/12">POPULAR</span>
                <span className="subtle text-xs">Cancel anytime</span>
              </div>
            <h3 className="text-xl font-semibold mt-4">Free</h3>
            <p className="muted text-base mt-2">Try it out</p>
            <div className="mb-8">
              <span className="text-5xl font-bold">€0</span>
              <span className="muted text-sm">/month</span>
            </div>
            <ul className="mt-5 space-y-2 subtle text-base">
              <li>5 jobs daily</li>
              <li>Basic matching</li>
            </ul>
            <a href="#signup" className="btn btn-primary mt-6 w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black min-h-[44px]">Get Started — Free</a>
            </div>

            {/* Premium tier */}
            <div className="card p-8">
              <div className="flex items-center justify-between">
                <span className="px-2 py-1 bg-white/[0.06] text-white/80 text-[12px] font-bold rounded-md border border-white/12">PREMIUM</span>
                <span className="subtle text-xs">Cancel anytime</span>
              </div>
            <h3 className="text-xl font-semibold mt-4">Premium</h3>
            <p className="muted text-base mt-2">More jobs, faster</p>
            <div className="mb-8">
              <span className="text-5xl font-bold">€{billing === 'monthly' ? '15' : '30'}</span>
              <span className="muted text-sm">/{billing === 'monthly' ? 'month' : '3 months'}</span>
            </div>
            <ul className="mt-5 space-y-2 subtle text-base">
              <li>10 jobs daily</li>
              <li>Advanced matching</li>
              <li>Priority support</li>
            </ul>
            <button className="btn btn-primary mt-6 w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black min-h-[44px]">Upgrade to Premium</button>
            </div>
          </div>
          <p className="text-center text-sm subtle mt-8">Cancel anytime</p>
        </div>
      </section>

      {/* SIGNUP SECTION */}
      <section id="signup" className="section-y">
        <div className="container-x">
          <div className="card p-8 text-center">
            <h3 className="text-2xl md:text-3xl font-semibold tracking-tight">Ready to try JobPing?</h3>
            <p className="muted text-base mt-2">It opens in a new tab.</p>
            <div className="mt-6">
              <a
                href="https://tally.so/r/mJEqx4?utm_source=landing&utm_medium=cta&utm_campaign=homepage"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary px-10 py-4 text-lg"
                onClick={() => trackEvent('signup_click', { location: 'signup_section', utm_source: 'landing', utm_medium: 'cta', utm_campaign: 'homepage' })}
              >
                Get Started — Free
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER - Ultra minimal */}
      <footer className="pt-20 pb-12 border-t border-white/10">
        <div className="container-x">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xl tracking-tight">JobPing</span>
            </div>
            
            <div className="flex flex-wrap gap-6 text-white/70">
              <a href="/legal/privacy-policy" className="font-semibold">Privacy</a>
              <a href="/legal/terms-of-service" className="font-semibold">Terms</a>
              <a href="/legal/unsubscribe" className="font-semibold">Unsubscribe</a>
              <a href="/contact" className="font-semibold">Contact</a>
            </div>
            
            <p className="text-white/50 text-base mt-8">© 2025 JobPing. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}