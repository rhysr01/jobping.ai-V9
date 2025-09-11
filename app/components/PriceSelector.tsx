'use client';

import { useState } from 'react';

type BillingCycle = 'monthly' | 'quarterly';

const PLANS = [
  {
    name: 'Free',
    price: '€0',
    features: [
      '5 jobs/day',
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
      '15 jobs/day',
      'Priority sources & filtering',
      'Cancel anytime'
    ],
    cta: 'Upgrade to Premium',
    ctaAction: 'premium'
  }
];

export default function PriceSelector() {
  const [billing, setBilling] = useState<BillingCycle>('monthly');

  const handlePlanClick = (action: string) => {
    if (action === 'premium') {
      const cycle = billing === 'quarterly' ? 'quarterly' : 'monthly';
      const url = `/api/create-checkout-session?cycle=${cycle}`;
      window.location.href = url;
    } else {
      const el = document.getElementById('signup');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
              className={`text-sm font-medium transition-colors ${billing === 'monthly' ? 'text-white' : 'text-zinc-400 hover:text-zinc-300'}`}
              aria-pressed={billing === 'monthly'}
            >
              Monthly (€15)
            </button>
            <span className="w-px h-4 bg-white/20" />
            <button
              onClick={() => setBilling('quarterly')}
              className={`text-sm font-medium transition-colors ${billing === 'quarterly' ? 'text-white' : 'text-zinc-400 hover:text-zinc-300'}`}
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
                      <span className="text-zinc-400 ml-2">
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
                    <li key={feature} className="text-zinc-400 text-sm flex items-center">
                      <span className="w-1.5 h-1.5 bg-white rounded-full mr-3 flex-shrink-0"></span>
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <button
                  onClick={() => handlePlanClick(plan.ctaAction)}
                  className={`w-full py-3 px-6 rounded-2xl font-medium transition-colors ${
                    plan.name === 'Free'
                      ? 'bg-white text-black hover:bg-zinc-100 shadow-lg hover:shadow-xl'
                      : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                  }`}
                  data-testid={`pricing-cta-${plan.name.toLowerCase()}`}
                  data-analytics="cta_click"
                  data-cta-type={plan.name === 'Free' ? 'free' : 'premium'}
                  data-cta-location="pricing"
                  data-plan-name={plan.name}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
