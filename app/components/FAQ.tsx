'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: "What's the difference between Free and Premium?",
    answer: "Free users get 3 personalised job matches per send on Thursdays. Premium users receive 6 matches per send on Tuesdays and Saturdays, with 24-hour early access to fresh job postings."
  },
  {
    question: "Where do jobs come from?",
    answer: "We source jobs from major job boards and directly from company career pages and official APIs to ensure freshness and accuracy."
  },
  {
    question: "Is there a dashboard?",
    answer: "No. JobPing is designed to be email-only. We deliver curated opportunities straight to your inbox so you can focus on applying, not searching."
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes. You can cancel your Premium subscription or unsubscribe from Free emails at any time, directly from your email or account settings. No contracts or hidden fees."
  }
];

export default function FAQ() {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set([0])); // First item open by default

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <section className="py-20 md:py-28 bg-black scroll-mt-20 md:scroll-mt-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="bg-white/5 rounded-xl p-6 md:p-8 border border-white/10">
          <h2 className="text-white font-semibold text-lg md:text-xl mb-6 text-center">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            {faqData.map((item, index) => (
              <div key={index} className="border-b border-white/10 last:border-b-0 pb-4 last:pb-0">
                <button
                  onClick={() => toggleItem(index)}
                  className="w-full text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-white/20 rounded-lg p-2 -m-2"
                >
                  <h3 className="text-white font-medium text-sm md:text-base pr-4">
                    {item.question}
                  </h3>
                  <ChevronDown 
                    className={`w-4 h-4 text-[#888888] transition-transform duration-200 ${
                      openItems.has(index) ? 'rotate-180' : ''
                    }`} 
                  />
                </button>
                
                {openItems.has(index) && (
                  <div className="mt-3 pl-2">
                    <p className="text-[#888888] text-xs md:text-sm leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
