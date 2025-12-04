"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BrandIcons } from "@/components/ui/BrandIcons";

const faqs = [
  {
    question: "Is this just another job board or newsletter?",
    answer: "No. JobPing is a matching service—we filter thousands of EU roles daily and send only roles that fit your cities, visa status, and experience level. No scrolling, no dashboards, just curated matches."
  },
  {
    question: "Do you apply for me?",
    answer: "No, we don't apply for you. We send you matched roles with direct apply links. You review each role and apply when it's a good fit—you're in control."
  },
  {
    question: "What countries do you cover?",
    answer: "We cover all EU countries plus the UK, Switzerland, and Norway. You can select up to 3 cities where you want to work, and we'll match roles in those locations."
  },
  {
    question: "Can I cancel immediately?",
    answer: "Yes. Cancel anytime from your email preferences link or by replying to any email. No questions asked, no hidden fees. Free users can pause or cancel in one click."
  },
  {
    question: "How often will you email me?",
    answer: `Free users get 5 matches every Thursday. Premium users get 15 matches per week (Monday, Wednesday, Friday). You can pause or adjust frequency anytime.`
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="pt-12 pb-8 border-t border-white/10 bg-black/40">
      <div className="container-page">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">Frequently Asked Questions</h2>
          
          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="rounded-lg border border-white/10 bg-white/[0.02] backdrop-blur-sm overflow-hidden"
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors"
                    aria-expanded={isOpen}
                  >
                    <span className="text-sm font-medium text-white pr-4">{faq.question}</span>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex-shrink-0"
                    >
                      <BrandIcons.ChevronDown className="h-4 w-4 text-zinc-400" />
                    </motion.div>
                  </button>
                  
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-3 pt-0">
                          <p className="text-sm text-zinc-300 leading-relaxed">{faq.answer}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

