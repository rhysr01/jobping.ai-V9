"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import LogoWordmark from "@/components/LogoWordmark";

export default function Footer() {
  const links = [
    { label: "About", href: "/about" },
    { label: "Pricing", href: "/pricing" },
    { label: "Privacy Policy", href: "/legal/privacy" },
    { label: "Terms", href: "/legal/terms" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <footer className="section-padding pb-[max(2rem,env(safe-area-inset-bottom))] border-t border-white/10 bg-black/40">
      <div className="container-page">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12"
        >
          {/* Left: Logo + Tagline */}
          <div className="flex flex-col gap-3">
            <div className="scale-60 md:scale-80 origin-left">
              <LogoWordmark />
            </div>
            <p className="text-xs text-content-muted max-w-md">
              AI-powered job matching for early-career roles across Europe. Get
              personalized matches delivered to your inbox.
            </p>
          </div>

          {/* Right: System Status */}
          <div className="flex flex-col items-start md:items-end gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-content-muted">
                Status: All Systems Operational
              </span>
            </div>

            <nav className="flex flex-wrap items-center gap-3 md:justify-end">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-xs text-content-muted transition-all duration-200 hover:text-content-secondary"
                >
                  {link.label}
                </Link>
              ))}
              <a
                href="mailto:support@jobping.com"
                className="text-xs text-content-muted transition-all duration-200 hover:text-content-secondary"
              >
                Support
              </a>
            </nav>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-8 pt-8 border-t border-white/5 text-center"
        >
          <p className="text-xs text-content-muted">
            © {new Date().getFullYear()} JobPing. All rights reserved.
          </p>
        </motion.div>
      </div>
    </footer>
  );
}
