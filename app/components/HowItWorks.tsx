import { User, Search, Mail } from 'lucide-react';

export default function HowItWorks() {
  return (
    <section className="section-spacing bg-[#030303] scroll-mt-20 md:scroll-mt-28">
      <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="text-center spacing-section-header">
          <h2 className="text-4xl font-bold text-white spacing-medium">How it works</h2>
          <p className="text-xl text-[#808080]">Get matched with your dream job in three simple steps</p>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-12 md:gap-16">
          <div className="flex items-center gap-4 group">
            <div className="w-12 h-12 bg-gradient-to-br from-[#111] to-[#0a0a0a] rounded-xl flex items-center justify-center border border-white/10 group-hover:border-white/20 transition-all duration-200">
              <User size={20} className="text-white" />
            </div>
            <span className="text-white font-medium">Pick your career path</span>
          </div>
          
          <div className="hidden md:block w-8 h-px bg-white/20"></div>
          
          <div className="flex items-center gap-4 group">
            <div className="w-12 h-12 bg-gradient-to-br from-[#111] to-[#0a0a0a] rounded-xl flex items-center justify-center border border-white/10 group-hover:border-white/20 transition-all duration-200">
              <Search size={20} className="text-white" />
            </div>
            <span className="text-white font-medium">AI analyzes 50+ sources</span>
          </div>
          
          <div className="hidden md:block w-8 h-px bg-white/20"></div>
          
          <div className="flex items-center gap-4 group">
            <div className="w-12 h-12 bg-gradient-to-br from-[#111] to-[#0a0a0a] rounded-xl flex items-center justify-center border border-white/10 group-hover:border-white/20 transition-all duration-200">
              <Mail size={20} className="text-white" />
            </div>
            <span className="text-white font-medium">Get 3-6 matched jobs</span>
          </div>
        </div>
      </div>
    </section>
  );
}
