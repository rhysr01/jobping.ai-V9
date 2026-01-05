"use client";

import { motion } from "framer-motion";
import { BrandIcons } from "@/components/ui/BrandIcons";

export default function TrustBadges() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="mt-6 flex items-center justify-center gap-4 px-4 py-3 rounded-full border border-white/10 bg-black/40 backdrop-blur-sm"
    >
      <span className="flex items-center gap-1.5 text-xs font-semibold text-white/90">
        <BrandIcons.CheckCircle className="h-3.5 w-3.5 text-brand-400 flex-shrink-0" />
        100% Free
      </span>
      <span className="w-px h-4 bg-white/10" />
      <span className="flex items-center gap-1.5 text-xs font-semibold text-white/90">
        <BrandIcons.Shield className="h-3.5 w-3.5 text-brand-400 flex-shrink-0" />
        GDPR Compliant
      </span>
      <span className="w-px h-4 bg-white/10" />
      <span className="flex items-center gap-1.5 text-xs font-semibold text-white/90">
        <BrandIcons.Zap className="h-3.5 w-3.5 text-brand-400 flex-shrink-0" />
        No Credit Card
      </span>
    </motion.div>
  );
}
