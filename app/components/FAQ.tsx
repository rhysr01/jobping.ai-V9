'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: "How many jobs do I get?",
    answer: "6-8 curated EU/UK jobs every 48 hours. No spam or irrelevant listings - just quality opportunities you can actually get."
  },
  {
    question: "Are jobs really visa-friendly?",
    answer: "Yes. We prioritize roles that sponsor visas or hire international students. Every job is screened for visa requirements before delivery."
  },
  {
    question: "What makes this different from LinkedIn/Indeed?",
    answer: "No endless scrolling. No applying to 100+ jobs. We deliver pre-filtered, relevant opportunities straight to your email. Focus on applications, not searching."
  },
  {
    question: "How fresh are the jobs?",
    answer: "Most jobs are posted within 24-72 hours. We scrape 2,800+ sources daily and deliver the newest opportunities first."
  },
  {
    question: "Can I cancel anytime?",
    answer: "Absolutely. No contracts, no fees. Simply reply 'unsubscribe' to any email or manage your preferences online."
  },
  {
    question: "Which countries/cities do you cover?",
    answer: "EU focus: London, Amsterdam, Berlin, Paris, Madrid, Barcelona, Dublin, Stockholm, Zurich, Milan, plus remote EU positions."
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
    <section className="py-24 bg-[#0B0B0F] relative">
      <div className="absolute inset-0 bg-pattern opacity-20"></div>
      <div className="container-frame">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[#F8F9FA] font-bold text-4xl lg:text-5xl mb-6 tracking-tight"
          >
            Questions About Getting Jobs Delivered?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-[#9CA3AF] text-xl max-w-2xl mx-auto leading-relaxed"
          >
            Everything you need to know about our EU/UK job delivery service.
          </motion.p>
        </div>

        {/* FAQ Items */}
        <div className="max-w-3xl mx-auto">
          {faqData.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="mb-4"
            >
              <div className="premium-card bg-[#151519] border border-[#374151] rounded-xl overflow-hidden hover:border-[#4B5563] transition-colors relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#10B981]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <button
                  onClick={() => toggleItem(index)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-[#0B0B0F]"
                >
                  <h3 className="text-[#F8F9FA] font-semibold text-lg pr-8">
                    {item.question}
                  </h3>
                  <motion.div
                    animate={{ rotate: openItems.has(index) ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="flex-shrink-0"
                  >
                    <ChevronDown className="w-5 h-5 text-[#9CA3AF]" />
                  </motion.div>
                </button>
                
                <AnimatePresence>
                  {openItems.has(index) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 border-t border-[#374151]">
                        <p className="text-[#D1D5DB] leading-relaxed pt-4">
                          {item.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center mt-16"
        >
          <p className="text-[#9CA3AF] mb-8 text-lg">
            Ready to stop job hunting and start getting opportunities delivered?
          </p>
          <a
            href="#signup"
            className="inline-flex items-center gap-3 bg-white text-[#0B0B0F] px-8 py-4 rounded-2xl font-bold text-lg hover:bg-[#F9F9F9] transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Get Your First Jobs Delivered
            <span>→</span>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
