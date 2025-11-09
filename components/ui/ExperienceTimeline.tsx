'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { BrandIcons } from './BrandIcons';

interface ExperienceOption {
  value: string;
  label: string;
  months: number;
  icon: string;
}

const EXPERIENCE_LEVELS: ExperienceOption[] = [
  { value: '0', label: '0', months: 0, icon: '🎓' },
  { value: '6 months', label: '6 months', months: 6, icon: '🌱' },
  { value: '1 year', label: '1 year', months: 12, icon: '⭐' },
  { value: '1-2 years', label: '1-2 years', months: 18, icon: '🚀' },
  { value: '2 years', label: '2 years', months: 24, icon: '💼' },
  { value: '3+ years', label: '3+ years', months: 36, icon: '🏆' }
];

interface ExperienceTimelineProps {
  selected: string;
  onChange: (value: string) => void;
}

export default function ExperienceTimeline({ selected, onChange }: ExperienceTimelineProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const selectedIndex = EXPERIENCE_LEVELS.findIndex(exp => exp.value === selected);
  const maxMonths = Math.max(...EXPERIENCE_LEVELS.map(e => e.months));

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
                <div className={`mt-3 text-center min-w-[60px] ${
                  isSelected || isHovered ? 'opacity-100' : 'opacity-60'
                }`}>
                  <div className="text-lg mb-1">{exp.icon}</div>
                  <div className={`text-xs font-semibold ${
                    isSelected ? 'text-brand-400' : 'text-zinc-400'
                  }`}>
                    {exp.label}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
      
      {/* Selected experience card */}
      {selectedIndex >= 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-gradient-to-r from-brand-500/10 via-purple-600/10 to-brand-500/10 rounded-2xl border-2 border-brand-500/30 shadow-glow-subtle"
        >
          <div className="flex items-center gap-3">
            <div className="text-2xl">{EXPERIENCE_LEVELS[selectedIndex].icon}</div>
            <div>
              <div className="text-sm font-semibold text-white">
                {EXPERIENCE_LEVELS[selectedIndex].label} experience
              </div>
              <div className="text-xs text-zinc-400">
                Perfect for early-career roles
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

