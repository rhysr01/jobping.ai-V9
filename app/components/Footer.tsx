'use client';

import { Mail, Shield, Globe } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#050505] border-t border-white/[0.06] py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
            <div className="text-2xl font-bold text-white">JobPing</div>
            <div className="text-[#606060] text-sm">© 2024 JobPing. All rights reserved.</div>
          </div>
          <div className="flex items-center gap-8">
            <a href="/privacy" className="text-[#808080] hover:text-white text-sm transition-colors">Privacy</a>
            <a href="/terms" className="text-[#808080] hover:text-white text-sm transition-colors">Terms</a>
            <a href="mailto:support@jobping.ai" className="text-[#808080] hover:text-white text-sm transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}