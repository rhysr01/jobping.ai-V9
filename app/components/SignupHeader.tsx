'use client';

import { useSearchParams } from 'next/navigation';

export function SignupHeader() {
  const params = useSearchParams();
  const plan = (params.get('plan') === 'premium' ? 'Premium' : 'Free') as 'Free' | 'Premium';

  return (
    <div className="mb-8">
      <div className="text-center">
        <h2 className="text-[#CCCCCC] font-light text-lg md:text-xl mb-6 tracking-wide">
          Get started
        </h2>
      </div>
    </div>
  );
}
