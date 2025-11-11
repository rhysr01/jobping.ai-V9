"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import { BrandIcons } from "@/components/ui/BrandIcons";
import {
  FREE_ROLES_PER_SEND,
  PREMIUM_ROLES_PER_WEEK,
  PREMIUM_ROLES_PER_MONTH,
} from "@/lib/productMetrics";

export default function SecondaryCTA() {
  return (
    <section className="section-padding pt-0">
      <div className="container-page container-rhythm">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="relative overflow-hidden rounded-3xl border border-brand-500/25 bg-gradient-to-r from-[#090021] via-[#120037] to-[#20054f] px-12 py-12 shadow-[0_30px_90px_rgba(12,0,42,0.45)]"
        >
          <div className="pointer-events-none absolute -left-24 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-brand-500/20 blur-[140px]" />
          <div className="pointer-events-none absolute -right-10 top-1/3 h-72 w-72 rounded-full bg-purple-500/20 blur-[160px]" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl space-y-4 text-left">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-brand-200">
                <BrandIcons.Mail className="h-4 w-4 text-brand-300" />
                Early-career inbox
              </span>
              <h3 className="text-3xl font-semibold text-white sm:text-4xl">
                Your first curated drop lands within 48 hours.
              </h3>
              <p className="text-base text-zinc-300 sm:text-lg">
                We hand-check every shortlist. Free users receive {FREE_ROLES_PER_SEND} roles in the first drop,
                and Premium keeps {PREMIUM_ROLES_PER_WEEK} new opportunities flowing each week (~{PREMIUM_ROLES_PER_MONTH} per month).
              </p>
              <p className="text-sm text-zinc-400">
                Proven deliverability, unsubscribe in one click, and {FREE_ROLES_PER_SEND} roles to get started immediately.
              </p>
            </div>

            <Button
              href="/signup"
              variant="primary"
              size="lg"
              className="min-w-[220px] self-start lg:self-auto"
            >
              Claim my first drop
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

