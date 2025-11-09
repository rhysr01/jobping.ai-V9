'use client';

import { motion } from 'framer-motion';
import { BrandIcons } from './BrandIcons';

interface EntryLevelOption {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
}

const ENTRY_LEVEL_OPTIONS: EntryLevelOption[] = [
  {
    value: 'Internship',
    label: 'Internship',
    icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
    ),
    description: 'Short-term learning',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    value: 'Graduate Programmes',
    label: 'Graduate Programmes',
    icon: BrandIcons.GraduationCap,
    description: 'Structured training',
    color: 'from-purple-500 to-pink-500'
  },
  {
    value: 'Entry Level',
    label: 'Entry Level',
    icon: BrandIcons.Target,
    description: 'First full-time role',
    color: 'from-green-500 to-emerald-500'
  },
  {
    value: 'Working Student',
    label: 'Working Student',
    icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        <rect x="16" y="11" width="6" height="8" rx="1"/>
        <path d="M19 11v6"/>
      </svg>
    ),
    description: 'Part-time while studying',
    color: 'from-orange-500 to-red-500'
  },
  {
    value: 'Not sure yet',
    label: 'Not sure yet',
    icon: BrandIcons.Sparkles,
    description: 'Open to all',
    color: 'from-indigo-500 to-purple-500'
  }
];

interface EntryLevelSelectorProps {
  selected: string[];
  onChange: (value: string) => void;
}

export default function EntryLevelSelector({ selected, onChange }: EntryLevelSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {ENTRY_LEVEL_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isSelected = selected.includes(option.value);
        
        return (
          <motion.button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={`relative rounded-2xl border-2 transition-all overflow-hidden group ${
              isSelected
                ? 'border-brand-500 bg-gradient-to-br from-brand-500/20 to-purple-600/10 shadow-glow-subtle'
                : 'border-zinc-700 bg-zinc-900/40 hover:border-zinc-600 hover:bg-zinc-900/60'
            }`}
          >
            {/* Background gradient */}
            {isSelected && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-purple-600/5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            )}
            
            <div className="relative p-5 flex items-center gap-4">
              {/* Icon */}
              <motion.div
                className={`p-3 rounded-xl ${
                  isSelected
                    ? 'bg-gradient-to-br from-brand-500/30 to-purple-600/20'
                    : 'bg-zinc-800/50 group-hover:bg-zinc-800/70'
                }`}
                whileHover={!isSelected ? { scale: 1.1, rotate: 5 } : {}}
                transition={{ duration: 0.2 }}
              >
                <Icon className={`w-6 h-6 ${
                  isSelected ? 'text-brand-400' : 'text-zinc-400 group-hover:text-zinc-300'
                }`} />
              </motion.div>
              
              {/* Label & Description */}
              <div className="flex-1 text-left">
                <div className={`font-bold mb-0.5 ${
                  isSelected ? 'text-white' : 'text-zinc-300'
                }`}>
                  {option.label}
                </div>
                <div className={`text-xs ${
                  isSelected ? 'text-zinc-300' : 'text-zinc-400'
                }`}>
                  {option.description}
                </div>
              </div>
              
              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-5 h-5 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center flex-shrink-0"
                >
                  <BrandIcons.Check className="w-3 h-3 text-white" />
                </motion.div>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

