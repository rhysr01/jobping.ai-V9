'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { BrandIcons } from './BrandIcons';

interface ExperienceOption {
  value: string;
  label: string;
  months: number;
  Icon: (props: { className?: string }) => JSX.Element;
  description: string;
}

const EXPERIENCE_LEVELS: ExperienceOption[] = [
  { value: '0', label: '0', months: 0, Icon: BrandIcons.GraduationCap, description: 'New to the field — learning fast.' },
  { value: '6 months', label: '6 months', months: 6, Icon: BrandIcons.Sparkles, description: 'Early hands-on experience.' },
  { value: '1 year', label: '1 year', months: 12, Icon: BrandIcons.Star, description: 'Solid foundation in place.' },
  { value: '1-2 years', label: '1-2 years', months: 18, Icon: BrandIcons.TrendingUp, description: 'Growing and ready for more.' },
  { value: '2 years', label: '2 years', months: 24, Icon: BrandIcons.Briefcase, description: 'Confident contributor.' },
  { value: '3+ years', label: '3+ years', months: 36, Icon: BrandIcons.CheckCircle, description: 'Seasoned early-career pro.' }
];

interface ExperienceTimelineProps {
  selected: string;
  onChange: (value: string) => void;
}

export default function ExperienceTimeline({ selected, onChange }: ExperienceTimelineProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const selectedIndex = EXPERIENCE_LEVELS.findIndex(exp => exp.value === selected);
  const maxMonths = Math.max(...EXPERIENCE_LEVELS.map(e => e.months));
  const selectedLevel = selectedIndex >= 0 ? EXPERIENCE_LEVELS[selectedIndex] : null;
  const SelectedIcon = selectedLevel?.Icon;

  return (
    <div className="space-y-6">
      {/* Timeline visualization */}
      <div className="relative">
        {/* Background track */}
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          {/* Progress fill */}
          {selectedIndex >= 0 && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(EXPERIENCE_LEVELS[selectedIndex].months / maxMonths) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-brand-500 via-purple-600 to-brand-500 rounded-full"
              style={{
                boxShadow: '0 0 20px rgba(154,106,255,0.5)'
              }}
            />
          )}
        </div>
        
        {/* Markers */}
        <div className="absolute inset-0 flex justify-between items-center -mt-1">
          {EXPERIENCE_LEVELS.map((exp, index) => {
            const isSelected = exp.value === selected;
            const isHovered = hoveredIndex === index;
            const isPast = selectedIndex >= 0 && index <= selectedIndex;
            
            return (
              <motion.button
                key={exp.value}
                type="button"
                onClick={() => onChange(exp.value)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="relative flex flex-col items-center group"
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
              >
                {/* Marker circle */}
                <motion.div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-gradient-to-br from-brand-500 to-purple-600 border-brand-400 shadow-glow-subtle scale-125'
                      : isPast
                      ? 'bg-brand-500/30 border-brand-500/50'
                      : isHovered
                      ? 'bg-zinc-700 border-zinc-500'
                      : 'bg-zinc-800 border-zinc-600'
                  }`}
                  animate={isSelected ? { scale: 1.25 } : {}}
                  transition={{ duration: 0.2 }}
                >
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-2 h-2 rounded-full bg-white"
                    />
                  )}
                </motion.div>
                
                {/* Pulse effect for selected */}
                {isSelected && (
                  <>
                    <motion.div
                      className="absolute w-6 h-6 rounded-full bg-brand-500/40"
                      animate={{
                        scale: [1, 2, 2],
                        opacity: [0.6, 0, 0]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeOut'
                      }}
                    />
                    <motion.div
                      className="absolute w-6 h-6 rounded-full bg-purple-500/40"
                      animate={{
                        scale: [1, 2, 2],
                        opacity: [0.6, 0, 0]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: 0.5,
                        ease: 'easeOut'
                      }}
                    />
                  </>
                )}
                
                {/* Label below */}
                <div
                  className={`mt-3 flex min-w-[72px] flex-col items-center gap-2 text-center ${
                    isSelected || isHovered ? 'opacity-100' : 'opacity-60'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all ${
                      isSelected
                        ? 'border-brand-400 bg-gradient-to-br from-brand-500 via-purple-500 to-brand-400 shadow-[0_0_14px_rgba(154,106,255,0.4)] text-white'
                        : 'border-zinc-600 bg-zinc-900 text-brand-200'
                    }`}
                    aria-hidden="true"
                  >
                    <exp.Icon className="w-4 h-4" />
                  </span>
                  <div
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      isSelected ? 'text-brand-300' : 'text-zinc-400'
                    }`}
                  >
                    {exp.label}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
      
      {/* Selected experience card */}
      {selectedLevel && SelectedIcon && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-gradient-to-r from-brand-500/10 via-purple-600/10 to-brand-500/10 rounded-2xl border-2 border-brand-500/30 shadow-glow-subtle"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 via-purple-500 to-brand-400 text-white shadow-[0_0_20px_rgba(154,106,255,0.35)]">
              <SelectedIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">
                {selectedLevel.label} experience
              </div>
              <div className="text-xs text-zinc-400">
                {selectedLevel.description}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

