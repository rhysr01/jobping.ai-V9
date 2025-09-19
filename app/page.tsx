'use client';

import { useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Footer from './components/Footer';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import { SignupHeader } from './components/SignupHeader';
// import PaymentModal from './components/PaymentModal';
// import { createCheckoutSessionWithRetry } from '@/Utils/paymentRetry';

// Enhanced PricingCard component
function PricingCard({ ribbon, name, price, descriptor, perks, ctaHref, ctaLabel, highlight = false, onPlanClick }: {
  ribbon?: string | null;
  name: string;
  price: string;
  descriptor: string;
  perks: string[];
  ctaHref: string;
  ctaLabel: string;
  highlight?: boolean;
  onPlanClick: (plan: 'free' | 'premium') => void;
}) {
  return (
    <div className={`${highlight ? "ring-2 ring-white/50 shadow-[0_25px_80px_-20px_rgba(255,255,255,0.1)]" : "ring-1 ring-white/15 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]"} relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/12 to-white/[0.04] p-8 hover:from-white/15 hover:to-white/[0.06] transition-all duration-300 group`}>
      {ribbon && (
        <div className="absolute -top-4 left-8 rounded-full border border-white/20 bg-gradient-to-r from-white to-gray-100 text-black px-3 py-1 text-xs font-bold shadow-lg">
          {ribbon}
        </div>
      )}
      
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <h4 className="text-2xl font-bold text-white mb-2">{name}</h4>
          <p className="text-white/60 text-sm">{descriptor}</p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold leading-none text-white">{price}</div>
          {price !== "€0" && <div className="text-white/50 text-sm mt-1">per month</div>}
        </div>
      </div>

      <ul className="space-y-4 mb-8">
        {perks.map((p, i) => (
          <li key={i} className="flex items-start gap-3 text-white/85">
            <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M16.707 5.293a1 1 0 0 1 0 1.414l-7.778 7.778a1 1 0 0 1-1.414 0L3.293 10.96a1 1 0 1 1 1.414-1.415l3.1 3.1 7.07-7.07a1 1 0 0 1 1.414 0z"/>
              </svg>
            </div>
            <span className="text-sm leading-relaxed">{p}</span>
          </li>
        ))}
      </ul>

      <button 
        onClick={() => ctaHref === '#signup' ? onPlanClick('free') : onPlanClick('premium')}
        className={`w-full py-4 px-6 rounded-2xl font-semibold text-sm transition-all duration-200 ${
          highlight
            ? "bg-white text-black hover:bg-gray-100 shadow-[0_15px_40px_-10px_rgba(255,255,255,0.8)] hover:shadow-[0_20px_50px_-10px_rgba(255,255,255,0.9)] transform hover:scale-[1.02]"
            : "border-2 border-white/25 text-white hover:bg-white/10 hover:border-white/40 transform hover:scale-[1.01]"
        }`}>
        {ctaLabel}
      </button>
    </div>
  );
}

export default function Home() {
  const [billing, setBilling] = useState<"monthly" | "quarterly">("monthly");

  const price = (tier: "free" | "pro") =>
    tier === "free" ? "€0" : (billing === "monthly" ? "€15/month" : "€30/quarter");

  const handlePlanClick = async (plan: 'free' | 'premium') => {
    if (plan === 'free') {
      // Scroll to signup section
      const signupSection = document.getElementById('signup');
      if (signupSection) {
        signupSection.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    // Handle premium plan - redirect to checkout
    const priceId = billing === 'monthly' ? 'price_monthly' : 'price_quarterly';
    window.location.href = `/api/create-checkout-session?priceId=${priceId}`;
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <Header />
      
      <main className="relative">
        {/* Hero Section */}
        <Hero />
        
        {/* Features Section */}
        <section className="section-spacing bg-[#030303] relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.01] to-transparent"></div>
          <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 relative">
            <Features />
          </div>
        </section>

        {/* Removed redundant email preview section */}

        {/* Job Preview Section (Gmail-like) */}
        <section className="section-spacing bg-black relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.01] to-transparent"></div>
          <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 relative">
            <div className="text-center spacing-section-header">
              <h2 className="text-4xl font-bold text-white spacing-medium">What you'll receive</h2>
              <p className="text-lg text-[#808080]">Premium job matches delivered to your inbox</p>
            </div>
            <div className="bg-gradient-to-br from-[#0f0f0f] to-[#0a0a0a] rounded-2xl p-8 border border-white/10 shadow-[0_0_40px_rgba(255,255,255,0.03)]">
              <div className="flex items-center gap-3 spacing-large pb-4 border-b border-white/[0.06]">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">J</span>
                </div>
                <div>
                  <h3 className="text-white font-medium">JobPing Daily</h3>
                  <p className="text-[#808080] text-sm">Your AI-matched opportunities</p>
                </div>
                <span className="ml-auto text-xs text-[#606060]">Today, 8:00 AM</span>
              </div>
              <div className="space-y-6">
                {[
                  { title: 'Frontend Developer', company: 'Adyen', location: 'Amsterdam', match: 94, salary: '€45-65k' },
                  { title: 'Junior Product Manager', company: 'Spotify', location: 'Stockholm', match: 87, salary: '€40-55k' },
                  { title: 'Data Analyst', company: 'Booking.com', location: 'Amsterdam', match: 91, salary: '€50-70k' }
                ].map((job, i) => (
                  <div key={i} className="group bg-[#0a0a0a] hover:bg-[#111] rounded-xl p-6 border border-white/[0.06] hover:border-white/[0.10] transition-all duration-200">
                    <div className="flex items-start justify-between spacing-small">
                      <div className="flex-1">
                        <h4 className="text-white font-medium text-base spacing-xs">{job.title}</h4>
                        <p className="text-[#808080] text-sm">{job.company} • {job.location}</p>
                      </div>
                      <span className="px-3 py-1 bg-white/[0.08] backdrop-blur text-white/90 text-xs font-medium rounded-full border border-white/[0.08]">
                        {job.match}% match
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[#606060] text-xs">Full-time • {job.salary}</p>
                      <button className="opacity-0 group-hover:opacity-100 text-white/60 hover:text-white text-xs transition-all">
                        View details →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.01] to-transparent"></div>
          <div className="relative">
            <HowItWorks />
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="bg-neutral-900 border-t border-white/10 relative overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 py-24">
            {/* Enhanced gradient overlay with subtle pattern */}
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/15 via-white/5 to-transparent pointer-events-none"></div>
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
              backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%),
                               radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 0%, transparent 50%)`
            }}></div>
            
            <div className="text-center relative z-10">
              <h2 className="text-4xl sm:text-6xl font-bold text-white mb-6 tracking-tight">Simple, Transparent Pricing</h2>
              <p className="text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">Choose the plan that works for your job search. No hidden fees, no surprises.</p>
            </div>

            {/* Enhanced billing toggle */}
            <div className="mt-8 flex justify-center">
              <div className="inline-flex rounded-full border border-white/20 bg-black/60 p-1 backdrop-blur-sm">
                {(["monthly","quarterly"] as const).map(k => (
                  <button
                    key={k}
                    onClick={() => setBilling(k)}
                    className={`px-6 py-2.5 text-sm font-medium rounded-full transition-all duration-200 ${
                      billing===k 
                        ? "bg-white text-black shadow-lg transform scale-105" 
                        : "text-white/75 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {k==="monthly" ? "Monthly (€15)" : "3 months (€30)"}
                  </button>
                ))}
              </div>
            </div>

            {/* Enhanced pricing cards */}
            <div className="mt-16 grid gap-8 sm:grid-cols-2 max-w-5xl mx-auto">
              <PricingCard
                ribbon={null}
                name="Free"
                price={price("free")}
                descriptor="For getting started"
                ctaLabel="Get started free"
                ctaHref="#signup"
                perks={["3 jobs per send", "Early-career targeting", "Cancel anytime"]}
                onPlanClick={handlePlanClick}
              />
              <PricingCard
                ribbon="Most popular"
                name="Premium"
                price={price("pro")}
                descriptor="For serious job hunters"
                ctaLabel="Upgrade to Premium"
                ctaHref="#checkout"
                perks={["6 jobs per send", "Early access to fresh jobs", "Cancel anytime"]}
                highlight
                onPlanClick={handlePlanClick}
              />
            </div>
          </div>
        </section>

        {/* Signup Section */}
        <section id="signup" className="section-spacing bg-black relative">
          <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12">
            <SignupHeader />
            <div className="max-w-md mx-auto">
              <div className="relative">
                <iframe
                  className="h-[400px] sm:h-[500px] md:h-[600px] w-full border-none focus-visible:ring-2 ring-white/10 rounded-xl"
                src="https://tally.so/r/mJEqx4?alignLeft=1&transparentBackground=1&hideTitle=1"
                data-testid="tally-iframe"
                title="JobPing Signup Form"
                aria-label="JobPing signup form"
                  allow="clipboard-write; fullscreen"
                />
                <div className="absolute inset-0 bg-black/50 backdrop-blur pointer-events-none opacity-0 transition" />
              </div>
            </div>
          </div>
        </section>

        {/* Enhanced FAQ Section */}
        <section id="faq" className="bg-neutral-900 border-t border-white/10 relative overflow-hidden">
          <div className="max-w-4xl mx-auto px-4 py-24">
            {/* Subtle background pattern */}
            <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{
              backgroundImage: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1) 0%, transparent 50%),
                               radial-gradient(circle at 70% 70%, rgba(255,255,255,0.1) 0%, transparent 50%)`
            }}></div>
            
            <div className="text-center mb-16 relative z-10">
              <h2 className="text-3xl sm:text-5xl font-bold text-white mb-6 tracking-tight">Frequently Asked Questions</h2>
              <p className="text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">Everything you need to know about JobPing</p>
            </div>
            
            <div className="divide-y divide-white/10 rounded-3xl border border-white/15 bg-black/50 backdrop-blur-sm shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]">
              <details className="group p-8 hover:bg-white/[0.02] transition-colors duration-200">
                <summary className="flex items-center justify-between text-lg font-semibold text-white cursor-pointer list-none">
                  <span>How does JobPing work?</span>
                  <svg className="w-6 h-6 text-white/60 group-open:rotate-180 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="mt-4 text-white/75 leading-relaxed text-base">
                  JobPing uses AI to match you with relevant graduate jobs from 50+ sources across Europe. Simply tell us your career preferences, and we'll send you 3-6 perfectly matched opportunities every 48 hours.
                </div>
              </details>
              
              <details className="group p-8 hover:bg-white/[0.02] transition-colors duration-200">
                <summary className="flex items-center justify-between text-lg font-semibold text-white cursor-pointer list-none">
                  <span>What's the difference between Free and Premium?</span>
                  <svg className="w-6 h-6 text-white/60 group-open:rotate-180 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="mt-4 text-white/75 leading-relaxed text-base">
                  Free users get 3 jobs per send, while Premium users get 6 jobs per send plus early access to the freshest opportunities. Both plans include early-career targeting and can be cancelled anytime.
                </div>
              </details>
              
              <details className="group p-8 hover:bg-white/[0.02] transition-colors duration-200">
                <summary className="flex items-center justify-between text-lg font-semibold text-white cursor-pointer list-none">
                  <span>How often will I receive job matches?</span>
                  <svg className="w-6 h-6 text-white/60 group-open:rotate-180 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="mt-4 text-white/75 leading-relaxed text-base">
                  You'll receive job matches every 48 hours. Free users get matches on Tuesdays and Saturdays, while Premium users get matches on Tuesdays, Thursdays, and Saturdays for more frequent opportunities.
                </div>
              </details>
              
              <details className="group p-8 hover:bg-white/[0.02] transition-colors duration-200">
                <summary className="flex items-center justify-between text-lg font-semibold text-white cursor-pointer list-none">
                  <span>Can I cancel my subscription anytime?</span>
                  <svg className="w-6 h-6 text-white/60 group-open:rotate-180 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="mt-4 text-white/75 leading-relaxed text-base">
                  Yes! You can cancel your subscription at any time with no questions asked. Your access will continue until the end of your current billing period.
                </div>
              </details>
              
              <details className="group p-8 hover:bg-white/[0.02] transition-colors duration-200">
                <summary className="flex items-center justify-between text-lg font-semibold text-white cursor-pointer list-none">
                  <span>What types of jobs do you focus on?</span>
                  <svg className="w-6 h-6 text-white/60 group-open:rotate-180 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="mt-4 text-white/75 leading-relaxed text-base">
                  We focus exclusively on early-career and graduate positions across tech, finance, consulting, and other high-growth industries. All jobs are entry-level or junior roles perfect for recent graduates.
                </div>
              </details>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
