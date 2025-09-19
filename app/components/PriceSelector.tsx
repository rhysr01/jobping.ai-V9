'use client';

import { useState } from 'react';
import PaymentModal from './PaymentModal';
import { createCheckoutSessionWithRetry } from '@/Utils/paymentRetry';

type BillingCycle = 'monthly' | 'quarterly';

const PLANS = [
  {
    name: 'Free',
    price: '€0',
    features: [
      '3 jobs per send (Thursdays)',
      'Early-career targeting',
      'Cancel anytime'
    ],
    cta: 'Get started free',
    ctaAction: 'free'
  },
  {
    name: 'Premium',
    price: '€15/month',
    features: [
      '6 jobs per send (Tue/Sat)',
      '24hr early access to fresh jobs',
      'Cancel anytime'
    ],
    cta: 'Upgrade to Premium',
    ctaAction: 'premium'
  }
];

export default function PriceSelector() {
  const [billing, setBilling] = useState<BillingCycle>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const handlePlanClick = (action: string) => {
    if (action === 'premium') {
      setShowPaymentModal(true);
    } else {
      const el = document.getElementById('signup');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handlePaymentConfirm = async (email: string, promoCode?: string) => {
    setIsLoading(true);
    
    try {
      const cycle = billing === 'quarterly' ? 'quarterly' : 'monthly';
      const priceId = cycle === 'quarterly' 
        ? process.env.NEXT_PUBLIC_STRIPE_PREMIUM_QUARTERLY_PRICE_ID
        : process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID;
      
      if (!priceId) {
        throw new Error('Payment configuration error. Please try again later.');
      }

      const result = await createCheckoutSessionWithRetry(
        email,
        priceId,
        'temp-user-id', // Replace with actual user ID when you have auth
        promoCode
      );
      
      if (result.success && result.promoApplied) {
        // Promo applied: mark success and close modal
        setShowPaymentModal(false);
        return;
      }

      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        throw new Error(result.error || 'Payment setup failed. Please try again.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      throw error; // Re-throw to let the modal handle the error display
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section id="pricing" className="section-spacing bg-[#030303] scroll-mt-20 md:scroll-mt-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="">
          {/* Minimal billing toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <button
              onClick={() => setBilling('monthly')}
              className={`text-sm font-medium transition-colors ${billing === 'monthly' ? 'text-white' : 'text-[#888888] hover:text-white'}`}
              aria-pressed={billing === 'monthly'}
            >
              Monthly (€15)
            </button>
            <span className="w-px h-4 bg-white/20" />
            <button
              onClick={() => setBilling('quarterly')}
              className={`text-sm font-medium transition-colors ${billing === 'quarterly' ? 'text-white' : 'text-[#888888] hover:text-white'}`}
              aria-pressed={billing === 'quarterly'}
            >
              3 months (€30)
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Free tier */}
            <div className="relative bg-black rounded-2xl p-8 border border-white/[0.06]">
              <h3 className="text-2xl font-bold mb-2">Free</h3>
              <div className="text-5xl font-bold mb-6">€0</div>
              <ul className="space-y-3 mb-8 text-[#a0a0a0]">
                <li className="flex items-center gap-2"><span className="text-white/40">✓</span> 3 jobs per send</li>
                <li className="flex items-center gap-2"><span className="text-white/40">✓</span> Early-career targeting</li>
                <li className="flex items-center gap-2"><span className="text-white/40">✓</span> Cancel anytime</li>
              </ul>
              <button onClick={() => handlePlanClick('free')} className="w-full btn-secondary">
                Get started free
              </button>
            </div>

            {/* Premium tier - highlighted */}
            <div className="relative bg-[#0a0a0a] rounded-2xl p-8 border border-white/[0.12]">
              <div className="absolute -inset-1 bg-gradient-to-r from-white/[0.04] to-white/[0.02] rounded-2xl blur-lg" />
              <div className="absolute -top-3 left-8 bg-white/10 backdrop-blur text-white text-xs px-3 py-1 rounded-full border border-white/20">
                MOST POPULAR
              </div>
              <div className="relative">
                <h3 className="text-2xl font-bold mb-2">Premium</h3>
              </div>
              <div className="text-5xl font-bold mb-6 relative">
                €15<span className="text-lg text-[#707070] font-normal">/month</span>
              </div>
              <ul className="space-y-3 mb-8 text-[#a0a0a0]">
                <li className="flex items-center gap-2"><span className="text-white/70">✓</span> 6 jobs per send</li>
                <li className="flex items-center gap-2"><span className="text-white/70">✓</span> Early access to fresh jobs</li>
                <li className="flex items-center gap-2"><span className="text-white/70">✓</span> Cancel anytime</li>
              </ul>
              <button onClick={() => handlePlanClick('premium')} disabled={isLoading} className="w-full btn-primary">
                Upgrade to Premium
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={handlePaymentConfirm}
        isLoading={isLoading}
      />
    </section>
  );
}
