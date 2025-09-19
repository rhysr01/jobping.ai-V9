'use client';

import { useState } from 'react';
import { FAQ_DATA } from '@/data/faq';
import { ChevronDown } from 'lucide-react';

type FAQItem = { question: string; answer: string };

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
    <div className="max-w-4xl mx-auto">
      <div className="space-y-4">
        {FAQ_DATA.map((item: FAQItem, index: number) => (
          <div key={index} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <button
              onClick={() => toggleItem(index)}
              className="w-full text-left flex items-center justify-between p-5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-xl group"
            >
              <h3 className="text-gray-900 font-medium text-base pr-4 group-hover:text-blue-600 transition-colors">
                {item.question}
              </h3>
              <ChevronDown
                className={`w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-all duration-300 ${
                  openItems.has(index) ? 'rotate-180' : ''
                }`}
              />
            </button>

            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
              openItems.has(index) ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}>
              <div className="px-5 pb-5">
                <p className="text-gray-600 text-sm leading-relaxed">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
