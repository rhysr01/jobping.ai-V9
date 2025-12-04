"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import FAQ from "./FAQ";

export default function Footer() {
  const links = [
    { label: "About", href: "/about" },
    { label: "Pricing", href: "/pricing" },
    { label: "Privacy Policy", href: "/legal/privacy" },
    { label: "Terms", href: "/legal/terms" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <>
      <FAQ />
      <footer className="section-padding border-t border-white/10 bg-black/40">
        <div className="container-page">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left"
          >
            <div className="flex flex-col gap-2">
              <p className="text-lg font-semibold text-white">JobPing</p>
              <p className="text-sm text-zinc-300">EU early-career roles in your inbox. weekly.</p>
            </div>
            
            <nav className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              {links.map((link, index) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-zinc-300 transition-colors hover:text-brand-200"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 pt-8 border-t border-white/5 text-center"
          >
            <p className="text-xs text-zinc-500">
              © {new Date().getFullYear()} JobPing. All rights reserved.
            </p>
          </motion.div>
        </div>
      </footer>
    </>
  );
}

