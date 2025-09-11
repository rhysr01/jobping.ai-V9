import { User, Search, Mail } from 'lucide-react';

export default function HowItWorks() {
  return (
    <section className="py-20 md:py-28 bg-black scroll-mt-20 md:scroll-mt-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
        <h2 className="text-white font-semibold text-2xl md:text-3xl mb-12 text-center tracking-[-0.01em]">
          How it works
        </h2>

        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
              <User size={20} className="text-white" />
            </div>
            <span className="text-white font-medium">Tell us preferences</span>
          </div>
          
          <div className="hidden md:block w-8 h-px bg-white/20"></div>
          
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
              <Search size={20} className="text-white" />
            </div>
            <span className="text-white font-medium">We fetch & filter</span>
          </div>
          
          <div className="hidden md:block w-8 h-px bg-white/20"></div>
          
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
              <Mail size={20} className="text-white" />
            </div>
            <span className="text-white font-medium">You get daily matches</span>
          </div>
        </div>
      </div>
    </section>
  );
}
