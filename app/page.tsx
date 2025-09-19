'use client';

import Header from './components/Header';
import Hero from './components/Hero';
import Footer from './components/Footer';
import FAQ from './components/FAQ';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import PriceSelector from './components/PriceSelector';
import { SignupHeader } from './components/SignupHeader';

export default function Home() {

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <Header />
      
      <main className="relative">
        {/* Hero Section */}
        <Hero />
        
        {/* Features Section */}
        <section className="section-spacing bg-[#030303]">
          <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12">
            <Features />
          </div>
        </section>

        {/* Removed redundant email preview section */}

        {/* Job Preview Section (Gmail-like) */}
        <section className="section-spacing bg-black">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl font-semibold text-center mb-3 text-white">What you'll receive</h2>
            <p className="text-center text-[#808080] mb-10">Premium job matches delivered to your inbox</p>
            <div className="bg-gradient-to-br from-[#0f0f0f] to-[#0a0a0a] rounded-2xl p-8 border border-white/10 shadow-[0_0_40px_rgba(255,255,255,0.03)]">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/[0.06]">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">J</span>
                </div>
                <div>
                  <h3 className="text-white font-medium">JobPing Daily</h3>
                  <p className="text-[#808080] text-sm">Your AI-matched opportunities</p>
                </div>
                <span className="ml-auto text-xs text-[#606060]">Today, 8:00 AM</span>
              </div>
              <div className="space-y-4">
                {[
                  { title: 'Frontend Developer', company: 'Adyen', location: 'Amsterdam', match: 94, salary: '€45-65k' },
                  { title: 'Junior Product Manager', company: 'Spotify', location: 'Stockholm', match: 87, salary: '€40-55k' },
                  { title: 'Data Analyst', company: 'Booking.com', location: 'Amsterdam', match: 91, salary: '€50-70k' }
                ].map((job, i) => (
                  <div key={i} className="group bg-[#0a0a0a] hover:bg-[#111] rounded-xl p-5 border border-white/[0.06] hover:border-white/[0.10] transition-all duration-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="text-white font-medium text-base mb-1">{job.title}</h4>
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
        <HowItWorks />

        {/* Pricing Section */}
        <PriceSelector />

        {/* Signup Section */}
        <section id="signup" className="section-spacing bg-black relative">
          <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12">
            <SignupHeader />
            <div className="max-w-md mx-auto">
              <div className="relative">
                <iframe
                  className="h-[450px] md:h-[600px] w-full border-none focus-visible:ring-2 ring-white/10 rounded-xl"
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

        {/* FAQ Section */}
        <FAQ />
      </main>

      <Footer />
    </div>
  );
}
