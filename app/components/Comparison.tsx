'use client';

import { motion } from 'framer-motion';
import { Check, X, Zap, Mail, Filter, Clock } from 'lucide-react';

interface ComparisonRow {
  feature: string;
  jobPing: string | boolean;
  linkedin: string | boolean;
  indeed: string | boolean;
  icon?: React.ReactNode;
}

const comparisonData: ComparisonRow[] = [
  {
    feature: "Job Volume",
    jobPing: "6-8 curated jobs",
    linkedin: "100+ irrelevant jobs",
    indeed: "Endless scrolling",
    icon: <Mail className="w-5 h-5" />
  },
  {
    feature: "Time Investment",
    jobPing: "2 minutes (check email)",
    linkedin: "2+ hours daily searching",
    indeed: "Hours of filtering",
    icon: <Clock className="w-5 h-5" />
  },
  {
    feature: "EU/UK Focus",
    jobPing: true,
    linkedin: false,
    indeed: false,
    icon: <Filter className="w-5 h-5" />
  },
  {
    feature: "Visa Screening",
    jobPing: "Pre-filtered visa-friendly",
    linkedin: "You figure it out",
    indeed: "Not mentioned",
    icon: <Check className="w-5 h-5" />
  },
  {
    feature: "Application Rate",
    jobPing: "Apply to 80% of jobs",
    linkedin: "Apply to 10% of jobs",
    indeed: "Apply to 5% of jobs",
    icon: <Zap className="w-5 h-5" />
  },
  {
    feature: "Job Freshness",
    jobPing: "24-72 hours old",
    linkedin: "Mixed, often stale",
    indeed: "Often weeks old",
    icon: <Clock className="w-5 h-5" />
  }
];

function ComparisonCell({ value, isJobPing = false }: { value: string | boolean; isJobPing?: boolean }) {
  if (typeof value === 'boolean') {
    return (
      <div className={`flex items-center justify-center p-3 ${isJobPing ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
        {value ? (
          <Check className={`w-6 h-6 ${isJobPing ? 'text-[#10B981]' : 'text-[#9CA3AF]'}`} />
        ) : (
          <X className="w-6 h-6 text-[#EF4444]" />
        )}
      </div>
    );
  }

  return (
    <div className={`p-3 text-center font-medium ${
      isJobPing 
        ? 'text-[#10B981] bg-[#10B981]/5 border border-[#10B981]/20 rounded-lg' 
        : 'text-[#9CA3AF]'
    }`}>
      {value}
    </div>
  );
}

export default function Comparison() {
  return (
    <section className="py-24 bg-[#0B0B0F] relative">
      <div className="absolute inset-0 bg-pattern opacity-20"></div>
      <div className="container-frame">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[#F8F9FA] font-bold text-4xl lg:text-5xl mb-6 tracking-tight"
          >
            Stop Wasting Time on Job Boards
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-[#9CA3AF] text-xl max-w-3xl mx-auto leading-relaxed"
          >
            Compare the old way (endless scrolling) vs the new way (curated delivery).
          </motion.p>
        </div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="max-w-5xl mx-auto"
        >
          <div className="premium-card bg-[#151519] border border-[#374151] rounded-2xl overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#10B981]/5 to-transparent opacity-30"></div>
            {/* Header Row */}
            <div className="grid grid-cols-4 gap-4 p-6 bg-[#1F1F23] border-b border-[#374151]">
              <div className="font-bold text-[#F8F9FA] text-lg">Feature</div>
              <div className="font-bold text-[#10B981] text-lg text-center">
                JobPing
                <div className="text-xs font-normal text-[#10B981] mt-1">✓ Smart Delivery</div>
              </div>
              <div className="font-bold text-[#9CA3AF] text-lg text-center">
                LinkedIn
                <div className="text-xs font-normal text-[#9CA3AF] mt-1">Manual Search</div>
              </div>
              <div className="font-bold text-[#9CA3AF] text-lg text-center">
                Indeed
                <div className="text-xs font-normal text-[#9CA3AF] mt-1">Manual Search</div>
              </div>
            </div>

            {/* Data Rows */}
            {comparisonData.map((row, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * index }}
                className={`grid grid-cols-4 gap-4 p-6 hover:bg-[#1F1F23]/50 transition-all duration-300 hover:scale-[1.01] relative group ${
                  index !== comparisonData.length - 1 ? 'border-b border-[#374151]' : ''
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#10B981]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="flex items-center gap-3 font-medium text-[#F8F9FA]">
                  <div className="text-[#9CA3AF]">{row.icon}</div>
                  {row.feature}
                </div>
                <ComparisonCell value={row.jobPing} isJobPing={true} />
                <ComparisonCell value={row.linkedin} />
                <ComparisonCell value={row.indeed} />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-4xl mx-auto"
        >
          <div className="text-center">
            <div className="text-3xl font-bold text-[#10B981] mb-2">2,800+</div>
            <div className="text-[#9CA3AF]">Sources scraped daily</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-[#10B981] mb-2">48hrs</div>
            <div className="text-[#9CA3AF]">Fresh delivery schedule</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-[#10B981] mb-2">EU/UK</div>
            <div className="text-[#9CA3AF]">Exclusive geographic focus</div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="text-center mt-16"
        >
          <p className="text-[#9CA3AF] mb-8 text-lg">
            Ready to switch from hunting to receiving?
          </p>
          <a
            href="#signup"
            className="premium-button inline-flex items-center gap-3 bg-white text-[#0B0B0F] px-8 py-4 rounded-2xl font-bold text-lg hover:bg-[#F9F9F9] transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden group"
          >
            Start Getting Jobs Delivered
            <span>→</span>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
