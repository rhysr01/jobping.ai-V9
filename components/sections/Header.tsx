'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import LogoWordmark from '@/components/LogoWordmark';
import Button from '@/components/ui/Button';
import { BrandIcons } from '@/components/ui/BrandIcons';
import { trackEvent } from '@/lib/analytics';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { label: 'How It Works', href: '#how-it-works', scroll: true },
    { label: 'Pricing', href: '#pricing', scroll: true },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string, scroll: boolean) => {
    if (scroll && href.startsWith('#')) {
      e.preventDefault();
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        trackEvent('nav_clicked', { link: href });
      }
    }
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-black/90 backdrop-blur-md border-b border-white/10 shadow-lg'
            : 'bg-transparent'
        }`}
      >
        <div className="container-page">
          <div className="h-20 md:h-24 flex items-center justify-between py-2">
            {/* Logo */}
            <Link
              href="/"
              onClick={() => {
                if (pathname === '/') {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
                trackEvent('logo_clicked', { location: 'header' });
              }}
              className="flex items-center gap-2 group py-1"
              aria-label="JobPing Home"
            >
              <div className="scale-75 md:scale-100 origin-left">
                <LogoWordmark />
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href, link.scroll)}
                  className="text-sm font-medium text-zinc-300 hover:text-white transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <Button
                href="/signup/free"
                onClick={() => {
                  trackEvent('cta_clicked', { type: 'free', location: 'header' });
                }}
                variant="gradient"
                size="sm"
                className="ml-4"
              >
                Get My 5 Free Matches
              </Button>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-zinc-300 hover:text-white transition-colors"
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
            />
            {/* Menu Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-black/95 backdrop-blur-xl border-l border-white/10 z-50 md:hidden overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <LogoWordmark />
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 text-zinc-300 hover:text-white"
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
                      className="text-lg font-medium text-zinc-300 hover:text-white transition-colors py-2"
                    >
                      {link.label}
                    </Link>
                  ))}
                  <Button
                    href="/signup/free"
                    onClick={() => {
                      trackEvent('cta_clicked', { type: 'free', location: 'header_mobile' });
                      setMobileMenuOpen(false);
                    }}
                    variant="gradient"
                    size="lg"
                    className="mt-4 w-full"
                  >
                    Get My 5 Free Matches
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

