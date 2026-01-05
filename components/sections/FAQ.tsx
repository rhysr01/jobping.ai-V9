"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { BrandIcons } from "@/components/ui/BrandIcons";

const faqs = [
  {
    question: "Is this just another job board or newsletter?",
    answer:
      "No. Job boards make you scroll. JobPing sends you only roles you qualify for - filtered by location, visa status, and experience level. Think of it as a personal job scout.",
  },
  {
    question: "What makes JobPing different from other services?",
    answer:
      "We match roles to your visa status, preferred cities, and experience level. We specialize in early-career roles - internships, graduate programs, and entry-level positions.",
  },
  {
    question: "Do you apply for me?",
    answer:
      "No. We send you pre-matched roles with direct apply links. You review and apply when it's a perfect fit.",
  },
  {
    question: "What countries and cities do you cover?",
    answer:
      "We cover all EU countries plus the UK, Switzerland, and Norway - 21 major cities including London, Dublin, Amsterdam, Berlin, Paris, and Madrid. You select up to 3 cities and we'll only send roles in those locations.",
  },
  {
    question: "How often will you email me?",
    answer: `Free users get 5 instant matches to try it out (one-time preview, no emails). Premium users get 15 matches per week across 3 drops (Monday, Wednesday, Friday).`,
  },
  {
    question: "Can I cancel immediately?",
    answer:
      "Yes. Cancel anytime, instantly. Click the unsubscribe link in any email or reply 'STOP'. No questions asked.",
  },
  {
    question: "What types of jobs will I receive?",
    answer:
      "Early-career opportunities only: internships, graduate schemes, and entry-level roles (0-2 years experience). Every match is tailored to your career path.",
  },
];

export default function FAQ() {
  // Open first question by default to show answers exist
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-32 md:py-40 border-t border-white/10 bg-black scroll-snap-section relative">
      {/* Scroll momentum fade */}
      <div className="absolute left-0 right-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-0" />

      <div className="container-page relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-2xl font-semibold text-content-heading mb-2 text-center tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-content-muted text-center mb-6">
            Click any question to see the answer
          </p>

          <div className="divide-y divide-white/5 space-y-0">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="py-6 md:py-8 first:pt-0"
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="w-full flex items-center justify-between text-left p-3 rounded-xl glass-card elevation-1 hover:elevation-2 transition-all duration-200 group"
                    aria-expanded={isOpen}
                  >
                    {/* Question with gradient */}
                    <span className="text-base font-bold text-content-heading pr-4 group-hover:text-white transition-colors">
                      {faq.question}
                    </span>

                    {/* Chevron with glow */}
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      className="flex-shrink-0 p-2 rounded-full bg-purple-500/10 border border-purple-500/20 group-hover:bg-purple-500/20 group-hover:border-purple-500/30 transition-all duration-200"
                    >
                      <BrandIcons.ChevronDown className="h-5 w-5 text-purple-300" />
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
                        {/* Answer with left border accent */}
                        <div className="pt-4 pl-3 pr-3 pb-2 ml-2 glass-card elevation-1 border-l-2 border-purple-500/30 rounded-r-lg">
                          <p className="text-sm text-content-secondary leading-relaxed">
                            {faq.answer}
                          </p>
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
