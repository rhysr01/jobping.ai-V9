'use client';

import { useState } from 'react';
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
    <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Section - Typography-First Design */}
          <div className="flex items-center">
            <h1 className="jobping-logo">
              <span className="job">Job</span>
              <span className="ping">Ping</span>
            </h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <button 
              onClick={() => scrollToSection('pricing')}
              className="text-[#888888] hover:text-white transition-colors text-sm font-medium underline decoration-white/10 underline-offset-4 hover:decoration-white/40"
            >
              Pricing
            </button>
            <button 
              onClick={() => scrollToSection('signup')}
              className="bg-white text-black px-6 py-2 rounded-xl font-semibold hover:bg-[#CCCCCC] transition-all duration-300 text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:-translate-y-0.5"
              data-testid="header-cta"
              data-analytics="cta_click"
              data-cta-type="primary"
              data-cta-location="header"
            >
              Get started free
              <ArrowRight className="w-4 h-4" />
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <button 
            onClick={toggleMobileMenu}
            className="md:hidden text-[#888888] hover:text-white p-2 transition-colors"
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
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-black/90 backdrop-blur-md">
            <nav className="flex flex-col space-y-4 py-6 px-6">
              <button 
                onClick={() => { scrollToSection('pricing'); closeMobileMenu(); }}
                className="text-[#888888] hover:text-white transition-colors text-sm font-medium py-2 text-left underline decoration-white/10 underline-offset-4 hover:decoration-white/40"
              >
                Pricing
              </button>
              <button 
                onClick={() => { scrollToSection('signup'); closeMobileMenu(); }}
                className="bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-[#CCCCCC] transition-all duration-300 text-sm flex items-center justify-center gap-2 w-full shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.15)]"
              >
                Get started free
                <ArrowRight className="w-4 h-4" />
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}