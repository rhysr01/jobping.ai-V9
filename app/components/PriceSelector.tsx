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
    <>
    <div className="max-w-4xl mx-auto">
      {/* Minimal billing toggle */}
      <div className="flex items-center justify-center gap-4 spacing-content">
        <button
          onClick={() => setBilling('monthly')}
          className={`text-sm font-medium transition-colors px-4 py-2 rounded-lg ${billing === 'monthly' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
          aria-pressed={billing === 'monthly'}
        >
          Monthly (€15)
        </button>
        <span className="w-px h-4 bg-gray-300" />
        <button
          onClick={() => setBilling('quarterly')}
          className={`text-sm font-medium transition-colors px-4 py-2 rounded-lg ${billing === 'quarterly' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
          aria-pressed={billing === 'quarterly'}
        >
          3 months (€30)
        </button>
      </div>
      
      <div className="grid md:grid-cols-2 gap-12">
        {/* Free tier */}
        <div className="relative bg-white rounded-2xl p-8 border border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-400 to-gray-600 rounded-t-2xl"></div>
          <h3 className="text-2xl font-bold spacing-small text-gray-900">Free</h3>
          <div className="text-5xl font-bold spacing-large text-gray-900">€0</div>
          <ul className="space-y-4 spacing-content text-gray-600">
            <li className="flex items-center gap-2"><span className="text-green-500">✓</span> 3 jobs per send</li>
            <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Early-career targeting</li>
            <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Cancel anytime</li>
          </ul>
          <button onClick={() => handlePlanClick('free')} className="w-full bg-gray-900 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-800 transition-colors">
            Get started free
          </button>
        </div>

        {/* Premium tier - highlighted */}
        <div className="relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-75"></div>
          <div className="relative bg-white rounded-2xl p-8 border border-gray-200 shadow-xl">
            <div className="absolute -top-3 left-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs px-3 py-1 rounded-full font-medium">
              MOST POPULAR
            </div>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-2xl"></div>
            <h3 className="text-2xl font-bold mb-2 text-gray-900">Premium</h3>
            <div className="text-5xl font-bold mb-6 text-gray-900">
              €15<span className="text-lg text-gray-500 font-normal">/month</span>
            </div>
            <ul className="space-y-3 mb-8 text-gray-600">
              <li className="flex items-center gap-2"><span className="text-blue-500">✓</span> 6 jobs per send</li>
              <li className="flex items-center gap-2"><span className="text-blue-500">✓</span> Early access to fresh jobs</li>
              <li className="flex items-center gap-2"><span className="text-blue-500">✓</span> Cancel anytime</li>
            </ul>
            <button onClick={() => handlePlanClick('premium')} disabled={isLoading} className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105">
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
    </>
  );
}
