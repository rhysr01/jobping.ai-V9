"use client";

import { motion } from "framer-motion";
import * as Copy from "@/lib/copy";

export default function InlineFAQ() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.6 }}
      className="mt-12 max-w-2xl mx-auto space-y-4"
    >
      {Copy.INLINE_FAQ_ITEMS.map((faq, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
          className="flex gap-4 items-start p-4 rounded-lg bg-white/[0.03] border border-white/10 hover:border-white/20 transition-colors"
        >
          <span className="text-2xl flex-shrink-0">{faq.icon}</span>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-white mb-1">
              {faq.question}
            </h4>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {faq.answer}
            </p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
