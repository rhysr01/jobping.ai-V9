"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import LogoWordmark from "@/components/LogoWordmark";
import { BrandIcons } from "@/components/ui/BrandIcons";
import Button from "@/components/ui/Button";
import { trackEvent } from "@/lib/analytics";
import { CTA_GET_MY_5_FREE_MATCHES } from "@/lib/copy";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      // Detect active section based on scroll position
      const howItWorks = document.getElementById("how-it-works");
      const pricing = document.getElementById("pricing");
      const scrollY = window.scrollY + 100; // Offset for header height

      if (pricing && scrollY >= pricing.offsetTop) {
        setActiveSection("#pricing");
      } else if (howItWorks && scrollY >= howItWorks.offsetTop) {
        setActiveSection("#how-it-works");
      } else {
        setActiveSection("");
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial check
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { label: "How It Works", href: "#how-it-works", scroll: true },
    { label: "Pricing", href: "#pricing", scroll: true },
  ];

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
    scroll: boolean,
  ) => {
    if (scroll && href.startsWith("#")) {
      e.preventDefault();
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        trackEvent("nav_clicked", { link: href });
      }
    }
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header
        className={`sticky top-0 left-0 right-0 z-50 transition-all duration-200 ${
          scrolled
            ? "bg-surface-base/70 backdrop-blur-md border-b border-white/5 shadow-lg"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="container-page">
          <div className="h-20 md:h-24 flex items-center justify-between py-2">
            {/* Logo */}
            <Link
              href="/"
              onClick={() => {
                if (pathname === "/") {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
                trackEvent("logo_clicked", { location: "header" });
              }}
              className="flex items-center gap-2 group py-1"
              aria-label="JobPing Home"
            >
              <div className="scale-90 md:scale-100 origin-left">
                <LogoWordmark />
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              {/* Navigation Links - Separate, not grouped */}
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href, link.scroll)}
                  className={`text-sm font-semibold transition-all duration-200 relative px-3 py-2 rounded-lg hover:bg-white/5 ${
                    activeSection === link.href
                      ? "text-white"
                      : "text-content-secondary hover:text-white"
                  }`}
                >
                  {link.label}
                  {activeSection === link.href && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute -bottom-1 left-0 right-0 h-0.5 bg-brand-600 rounded-full"
                      initial={false}
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
                </Link>
              ))}

              {/* CTA Button - Always prominent */}
              <Button
                href="/signup/free"
                onClick={() => {
                  trackEvent("cta_clicked", {
                    type: "free",
                    location: "header",
                  });
                }}
                variant="gradient"
                size="sm"
                className="shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50"
              >
                <span className="flex items-center gap-2">
                  {CTA_GET_MY_5_FREE_MATCHES}
                  <BrandIcons.ArrowRight className="h-4 w-4" />
                </span>
              </Button>
            </nav>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-content-secondary hover:text-white transition-all duration-200"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <BrandIcons.X className="h-6 w-6" />
              ) : (
                <BrandIcons.Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.button
              type="button"
              aria-label="Close menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
            />
            {/* Menu Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-black/95 backdrop-blur-xl border-l border-white/10 z-50 md:hidden overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <LogoWordmark />
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 text-content-secondary hover:text-white transition-all duration-200"
                    aria-label="Close menu"
                  >
                    <BrandIcons.X className="h-6 w-6" />
                  </button>
                </div>
                <nav className="flex flex-col gap-4">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={(e) => handleNavClick(e, link.href, link.scroll)}
                      className={`text-lg font-medium transition-all duration-200 py-2 ${
                        activeSection === link.href
                          ? "text-white"
                          : "text-content-disabled hover:text-white"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <Button
                    href="/signup/free"
                    onClick={() => {
                      trackEvent("cta_clicked", {
                        type: "free",
                        location: "header_mobile",
                      });
                      setMobileMenuOpen(false);
                    }}
                    variant="gradient"
                    size="lg"
                    className="mt-4 w-full"
                  >
                    <span className="flex items-center justify-center gap-2">
                      {CTA_GET_MY_5_FREE_MATCHES}
                      <BrandIcons.ArrowRight className="h-5 w-5" />
                    </span>
                  </Button>
                </nav>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
