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
    <section className="section-padding pt-0 scroll-snap-section relative">
      {/* Scroll momentum fade */}
      <div className="absolute left-0 right-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-0" />
      <div className="container-page relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="relative overflow-hidden rounded-2xl bg-white/[0.06] border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.35)] backdrop-blur-xl p-8 md:p-12 hover:-translate-y-1 transition-all duration-200"
        >
          <div className="relative flex flex-col gap-6 md:grid md:grid-cols-[1.6fr_1fr] lg:flex lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl space-y-4 text-left">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">
                <BrandIcons.Mail className="h-4 w-4 text-brand-400" />
                EARLY-CAREER INBOX
              </span>
              <h3 className="text-5xl font-semibold tracking-[-0.02em] text-white md:text-6xl">
                Your first curated drop arrives within 48 hours.
              </h3>
              <p className="text-xl text-zinc-300 md:text-2xl">
                Get {SIGNUP_INITIAL_ROLES} jobs in your welcome email, then curated drops weekly. Free users receive {FREE_ROLES_PER_SEND} roles per drop,
                and Premium keeps {PREMIUM_ROLES_PER_WEEK} new opportunities flowing each week (~{PREMIUM_ROLES_PER_MONTH} per month).
              </p>
              <p className="text-base text-zinc-300/90 leading-relaxed">
                Proven deliverability, unsubscribe in one click, and {FREE_ROLES_PER_SEND} roles to claim your first drop.
              </p>
            </div>

            <Button
              href="/signup"
              variant="primary"
              size="lg"
              className="min-w-[240px] self-start font-semibold lg:self-auto"
            >
              Claim my first drop
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

