import { ButtonPrimary, ButtonOutline } from '@/components/ui/Button';
import { 
  PRICING_TITLE, 
  PRICING_SUBTITLE, 
  FREE_PLAN_TITLE, 
  FREE_PLAN_SUBTITLE, 
  FREE_PLAN_FEATURES,
  PREMIUM_PLAN_TITLE,
  PREMIUM_PLAN_SUBTITLE,
  PREMIUM_PLAN_PRICE,
  PREMIUM_PLAN_PRICE_UNIT,
  PREMIUM_PLAN_ANNUAL,
  PREMIUM_PLAN_FEATURES,
  REASSURANCE_ITEMS,
  CTA_FREE,
  CTA_PREMIUM
} from '@/lib/copy';

export default function PricingSection() {
  return (
    <section className="mx-auto max-w-[80rem] px-6 md:px-8 py-20 md:py-24">
      <h2 className="font-bold text-4xl md:text-5xl tracking-tight text-center">{PRICING_TITLE}</h2>
      <p className="mt-4 text-lg text-zinc-300 text-center font-medium">{PRICING_SUBTITLE}</p>

      <div className="mt-10 grid md:grid-cols-2 gap-8">
        {/* Free */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-8">
          <h3 className="font-bold text-2xl">{FREE_PLAN_TITLE}</h3>
          <p className="mt-3 text-lg text-zinc-300 font-medium">{FREE_PLAN_SUBTITLE}</p>
          <ul className="mt-6 space-y-3 text-base text-zinc-300 font-medium">
            {FREE_PLAN_FEATURES.map((feature, index) => (
              <li key={index}>• {feature}</li>
            ))}
          </ul>
          <ButtonPrimary 
            href="https://tally.so/r/mJEqx4?utm_source=landing&utm_medium=pricing&utm_campaign=free"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6"
          >
            {CTA_FREE}
          </ButtonPrimary>
        </div>
        
        {/* Premium */}
        <div className="rounded-2xl border border-zinc-700 bg-zinc-900/40 ring-1 ring-indigo-500/20 p-8">
          <span className="inline-block text-xs px-2 py-1 rounded-full bg-indigo-500/15 text-indigo-300">Popular</span>
          <h3 className="font-bold text-2xl mt-2">{PREMIUM_PLAN_TITLE}</h3>
          <p className="mt-3 text-lg text-zinc-300 font-medium">{PREMIUM_PLAN_SUBTITLE}</p>
          <div className="mt-4 text-3xl font-bold text-white">{PREMIUM_PLAN_PRICE}<span className="text-lg text-zinc-400">{PREMIUM_PLAN_PRICE_UNIT}</span></div>
          <div className="text-sm text-zinc-400">{PREMIUM_PLAN_ANNUAL}</div>
          <ul className="mt-6 space-y-3 text-base text-zinc-300 font-medium">
            {PREMIUM_PLAN_FEATURES.map((feature, index) => (
              <li key={index}>• {feature}</li>
            ))}
          </ul>
          <ButtonOutline 
            href="https://tally.so/r/mJEqx4?utm_source=landing&utm_medium=pricing&utm_campaign=premium"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6"
          >
            {CTA_PREMIUM}
          </ButtonOutline>
        </div>
      </div>
      
      {/* Reassurance micro-copy */}
      <div className="mt-12 text-center">
        <div className="inline-flex items-center gap-6 text-sm text-zinc-400">
          {REASSURANCE_ITEMS.map((item, index) => (
            <span key={index} className="flex items-center gap-2">
              <span className="w-1 h-1 bg-brand-500 rounded-full"></span>
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
