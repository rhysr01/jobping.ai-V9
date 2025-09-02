'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Menu, X } from 'lucide-react';

const scrollToSection = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 bg-[#0B0B0F]/95 backdrop-blur-md border-b border-[#374151]"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Section - Typography-First Design */}
          <motion.div
            className="flex items-center"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <h1 className="jobping-logo">
              <span className="job">Job</span>
              <span className="ping">Ping</span>
            </h1>
          </motion.div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <button 
              onClick={() => scrollToSection('features')}
              className="text-[#9CA3AF] hover:text-white transition-colors duration-200 text-sm font-medium"
            >
              Features
            </button>
            <button 
              onClick={() => scrollToSection('pricing')}
              className="text-[#9CA3AF] hover:text-white transition-colors duration-200 text-sm font-medium"
            >
              Pricing
            </button>
            <button 
              onClick={() => scrollToSection('signup')}
              className="bg-white text-[#0B0B0F] px-6 py-2 rounded-lg font-semibold hover:bg-[#F8F9FA] transition-all duration-200 text-sm flex items-center gap-2"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <button 
            onClick={toggleMobileMenu}
            className="md:hidden text-[#9CA3AF] hover:text-white p-2 transition-colors"
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="md:hidden border-t border-[#374151] bg-[#0B0B0F]/95 backdrop-blur-md"
            >
              <nav className="flex flex-col space-y-4 py-6 px-6">
                <button 
                  onClick={() => { scrollToSection('features'); closeMobileMenu(); }}
                  className="text-[#9CA3AF] hover:text-white transition-colors duration-200 text-sm font-medium py-2 text-left"
                >
                  Features
                </button>
                <button 
                  onClick={() => { scrollToSection('pricing'); closeMobileMenu(); }}
                  className="text-[#9CA3AF] hover:text-white transition-colors duration-200 text-sm font-medium py-2 text-left"
                >
                  Pricing
                </button>
                <button 
                  onClick={() => { scrollToSection('signup'); closeMobileMenu(); }}
                  className="bg-white text-[#0B0B0F] px-6 py-3 rounded-lg font-semibold hover:bg-[#F8F9FA] transition-all duration-200 text-sm flex items-center justify-center gap-2 w-full"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </button>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}