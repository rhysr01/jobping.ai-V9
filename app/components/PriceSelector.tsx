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

  const handlePaymentConfirm = async (email: string) => {
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
        'temp-user-id' // Replace with actual user ID when you have auth
      );
      
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
    <section id="pricing" className="py-20 md:py-28 bg-black scroll-mt-20 md:scroll-mt-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="bg-white/5 rounded-2xl p-8 border border-white/10 shadow-lg">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {PLANS.map((plan) => (
              <div key={plan.name} className="text-center">
                <h3 className="text-white font-semibold text-2xl mb-2 tracking-[-0.01em]">
                  {plan.name}
                </h3>
                
                <div className="mb-6">
                  {plan.name === 'Premium' ? (
                    <>
                      <span className="text-white text-4xl font-semibold tracking-[-0.02em]">
                        {billing === 'monthly' ? '€15' : '€30'}
                      </span>
                      <span className="text-[#888888] ml-2">
                        {billing === 'monthly' ? '/month' : '/3 months'}
                      </span>
                    </>
                  ) : (
                    <span className="text-white text-4xl font-semibold tracking-[-0.02em]">
                      {plan.price}
                    </span>
                  )}
                </div>
                
                <ul className="space-y-3 mb-8 text-left">
                  {plan.features.map((feature) => (
                    <li key={feature} className="text-[#888888] text-sm flex items-center">
                      <span className="w-1.5 h-1.5 bg-white rounded-full mr-3 flex-shrink-0"></span>
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <button
                  onClick={() => handlePlanClick(plan.ctaAction)}
                  disabled={isLoading && plan.ctaAction === 'premium'}
                  className={`w-full py-3 px-6 rounded-2xl font-medium transition-all duration-300 ${
                    plan.name === 'Free'
                      ? 'bg-white text-black hover:bg-[#CCCCCC] shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:-translate-y-1'
                      : 'bg-[#111111] text-white border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:border-[#333333] shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]'
                  } ${isLoading && plan.ctaAction === 'premium' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  data-testid={`pricing-cta-${plan.name.toLowerCase()}`}
                  data-analytics="cta_click"
                  data-cta-type={plan.name === 'Free' ? 'free' : 'premium'}
                  data-cta-location="pricing"
                  data-plan-name={plan.name}
                >
                  {isLoading && plan.ctaAction === 'premium' ? 'Processing...' : plan.cta}
                </button>
              </div>
            ))}
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
