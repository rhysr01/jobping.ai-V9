"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import { BrandIcons } from "@/components/ui/BrandIcons";
import {
  SIGNUP_INITIAL_ROLES,
  FREE_ROLES_PER_SEND,
  PREMIUM_ROLES_PER_WEEK,
  PREMIUM_ROLES_PER_MONTH,
} from "@/lib/productMetrics";

export default function SecondaryCTA() {
  return (
    <section className="pt-16 pb-16 md:pt-20 md:pb-20 lg:pt-24 lg:pb-24 scroll-snap-section relative">
      {/* Scroll momentum fade */}
      <div className="absolute left-0 right-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-0" />
      {/* Soft section band */}
      <div className="pointer-events-none absolute inset-x-0 -top-10 h-40 bg-gradient-to-b from-zinc-900/50 to-transparent" />
      <div className="container-page relative z-10">
        <div className="mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="relative overflow-hidden rounded-xl bg-zinc-900/90 border border-white/8 shadow-[0_4px_20px_rgba(0,0,0,0.35)] backdrop-blur-xl px-6 py-10 md:px-10 md:py-12 text-center hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.65)] transition-all duration-200"
          >
          <div className="flex flex-col md:grid md:grid-cols-[2fr_minmax(0,1fr)] md:items-center gap-6">
            <div className="text-left">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300">
                <BrandIcons.Mail className="h-4 w-4 text-brand-400" />
                EARLY-CAREER INBOX
              </span>
              <h3 className="text-5xl font-semibold tracking-[-0.02em] text-white md:text-6xl mt-4">
                Your first curated set arrives within 48 hours.
              </h3>
              <p className="text-xl text-zinc-300 md:text-2xl mt-4">
                Curated matches weekly. Free users receive {FREE_ROLES_PER_SEND} roles per email,
                and Premium keeps {PREMIUM_ROLES_PER_WEEK} new opportunities flowing each week (~{PREMIUM_ROLES_PER_MONTH} per month).
              </p>
              <p className="text-base text-zinc-300/90 leading-relaxed mt-4">
                Proven deliverability, unsubscribe in one click.
              </p>
            </div>

            <div className="flex md:justify-end">
            <Button
              href="/signup"
              variant="primary"
              size="lg"
              className="w-full md:w-auto px-7 py-4 md:py-5 text-base md:text-lg"
            >
              Get my first 5 matches
            </Button>
            </div>
          </div>
        </motion.div>
        </div>
      </div>
    </section>
  );
}

