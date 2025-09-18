'use client';

import { Mail, Shield, Globe } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#0B0B0F] border-t border-[#1A1A1A] py-24 md:py-32 px-6 sm:px-8 md:px-12">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-16 mb-16 md:mb-20">
          
          {/* Company Info */}
          <div className="md:col-span-2">
            <div className="mb-4">
              <h3 className="jobping-logo text-xl">
                <span className="job">Job</span>
                <span className="ping">Ping</span>
              </h3>
            </div>
            <p className="text-[#AAAAAA] text-base leading-relaxed mb-8 max-w-md">
              Job matching for graduates.
            </p>
            <div className="flex items-center gap-8 text-[#888888] text-sm">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>GDPR Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span>EU Friendly</span>
              </div>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-[#F8F9FA] font-semibold mb-4">Product</h4>
            <ul className="space-y-3 text-[#888888]">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-white transition-colors">How it Works</a></li>
              <li><a href="#" className="hover:text-white transition-colors">AI Matching</a></li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div>
            <h4 className="text-[#F8F9FA] font-semibold mb-4">Support</h4>
            <ul className="space-y-3 text-[#888888]">
              <li><a href="https://jobping.ai/privacy" className="hover:text-white transition-colors" rel="noopener noreferrer">Privacy Policy</a></li>
              <li><a href="https://jobping.ai/terms" className="hover:text-white transition-colors" rel="noopener noreferrer">Terms of Service</a></li>
              <li><a href="mailto:support@jobping.ai" className="hover:text-white transition-colors">Contact Us</a></li>
              <li><a href="https://help.jobping.ai" className="hover:text-white transition-colors" rel="noopener noreferrer">Help Center</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#1A1A1A] pt-12 md:pt-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-[#777777] text-sm">
              © 2024 JobPing. All rights reserved.
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-[#777777] text-sm">
                <Mail className="w-4 h-4" />
                <span>support@jobping.ai</span>
              </div>
              <div className="text-[#777777] text-sm">
                24h response
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}