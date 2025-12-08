"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BrandIcons } from "@/components/ui/BrandIcons";

const faqs = [
  {
    question: "Is this just another job board or newsletter?",
    answer: "No—JobPing saves you hours every week. While job boards make you scroll through hundreds of irrelevant posts, we do the heavy lifting: we scan thousands of EU roles daily, filter by your exact preferences (cities, visa status, experience level, career path), and send only roles you can actually land. Think of us as your personal job scout—no more wasted time on applications you're not qualified for."
  },
  {
    question: "What makes JobPing different from other services?",
    answer: "Three things: precision, time-saving, and early-career focus. We match roles to your specific visa status (so you only see jobs you're eligible for), your preferred cities (no relocation surprises), and your experience level (internships vs. graduate schemes). Plus, we specialize in early-career roles—internships, graduate programs, and entry-level positions—so you're not competing with senior candidates. Most importantly: everything comes to your inbox. No logging in, no dashboards, no daily checking—just quality matches delivered weekly."
  },
  {
    question: "Do you apply for me?",
    answer: "No, we don't apply for you—and that's by design. You stay in control. We send you pre-matched roles with direct apply links, so you can review each opportunity and apply when it's a perfect fit. This means you spend time on applications that matter, not on mass-applying to jobs you're not qualified for. Quality over quantity."
  },
  {
    question: "What countries and cities do you cover?",
    answer: "We cover all EU countries plus the UK, Switzerland, and Norway—21 major cities including London, Dublin, Amsterdam, Berlin, Paris, Madrid, and more. You select up to 3 cities where you want to work, and we'll only send roles in those exact locations. No more sifting through jobs in cities you don't want to move to."
  },
  {
    question: "How often will you email me?",
    answer: `Free users get 5 hand-picked matches (one-time, no emails). Premium users get 15 matches per week across 3 drops (Monday, Wednesday, Friday)—that's 10 more than free (3x more) and 60+ quality opportunities per month. You can pause or adjust frequency anytime with one click. No spam, just relevant roles when you need them.`
  },
  {
    question: "Can I cancel immediately?",
    answer: "Yes—cancel anytime, instantly. Click the unsubscribe link in any email or reply 'STOP'. No questions asked, no hidden fees, no retention tactics. Free users can pause or cancel in one click. We believe in earning your trust, not trapping you."
  },
  {
    question: "What types of jobs will I receive?",
    answer: "Early-career opportunities only: internships, graduate schemes, trainee programs, and entry-level roles (0-2 years experience). We focus on roles you can actually land—no senior positions, no unrealistic requirements. Every match is tailored to your career path (Strategy, Finance, Marketing, Tech, etc.) and your experience level, so you're always seeing opportunities that fit where you are in your career journey."
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

