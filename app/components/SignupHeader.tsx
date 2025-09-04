'use client';

import { useSearchParams } from 'next/navigation';

export function SignupHeader() {
  const params = useSearchParams();
  const plan = (params.get('plan') === 'premium' ? 'Premium' : 'Free') as 'Free' | 'Premium';

  return (
    <div className="mb-8">
      <div className="text-center">
        <h2 className="text-[#F8F9FA] font-bold text-3xl lg:text-4xl mb-4">
          {plan === 'Premium' ? 'Get started — Premium' : 'Get started — Free'}
        </h2>

      </div>
    </div>
  );
}
