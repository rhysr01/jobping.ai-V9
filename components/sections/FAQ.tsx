"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BrandIcons } from "@/components/ui/BrandIcons";

const faqs = [
  {
    question: "Is this just another job board or newsletter?",
    answer: "No. Job boards make you scroll. JobPing sends you only roles you qualify for - filtered by location, visa status, and experience level. Think of it as a personal job scout."
  },
  {
    question: "What makes JobPing different from other services?",
    answer: "We match roles to your visa status, preferred cities, and experience level. We specialize in early-career roles - internships, graduate programs, and entry-level positions."
  },
  {
    question: "Do you apply for me?",
    answer: "No. We send you pre-matched roles with direct apply links. You review and apply when it's a perfect fit."
  },
  {
    question: "What countries and cities do you cover?",
    answer: "We cover all EU countries plus the UK, Switzerland, and Norway - 21 major cities including London, Dublin, Amsterdam, Berlin, Paris, and Madrid. You select up to 3 cities and we'll only send roles in those locations."
  },
  {
    question: "How often will you email me?",
    answer: `Free users get 5 example matches to try it out (one-time preview, no emails). Premium users get 15 matches per week across 3 drops (Monday, Wednesday, Friday).`
  },
  {
    question: "Can I cancel immediately?",
    answer: "Yes. Cancel anytime, instantly. Click the unsubscribe link in any email or reply 'STOP'. No questions asked."
  },
  {
    question: "What types of jobs will I receive?",
    answer: "Early-career opportunities only: internships, graduate schemes, and entry-level roles (0-2 years experience). Every match is tailored to your career path."
  }
];

export default function FAQ() {
  // Open first question by default to show answers exist
  const [openIndex, setOpenIndex] = useState<number | null>(0);

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
          <h2 className="text-2xl font-semibold text-white mb-2 text-center">Frequently Asked Questions</h2>
          <p className="text-sm text-zinc-400 text-center mb-6">Click any question to see the answer</p>
          
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

