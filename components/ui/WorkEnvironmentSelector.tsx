"use client";

import { motion } from "framer-motion";
import { BrandIcons } from "./BrandIcons";

interface WorkEnvironmentOption {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
}

const WORK_ENVIRONMENTS: WorkEnvironmentOption[] = [
  {
    value: "Office",
    label: "Office",
    icon: ({ className }) => (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="9" y1="3" x2="9" y2="21" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <rect x="5" y="5" width="3" height="3" rx="0.5" />
        <rect x="16" y="5" width="3" height="3" rx="0.5" />
        <rect x="5" y="16" width="3" height="3" rx="0.5" />
        <rect x="16" y="16" width="3" height="3" rx="0.5" />
      </svg>
    ),
    description: "On-site work",
    color: "from-blue-500 to-blue-600",
  },
  {
    value: "Hybrid",
    label: "Hybrid",
    icon: ({ className }) => (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="8" height="8" rx="1" />
        <rect x="13" y="3" width="8" height="8" rx="1" />
        <rect x="3" y="13" width="8" height="8" rx="1" />
        <path d="M13 13h8v8h-8z" />
        <circle cx="9" cy="7" r="1.5" />
        <circle cx="19" cy="7" r="1.5" />
        <circle cx="9" cy="17" r="1.5" />
        <circle cx="19" cy="17" r="1.5" />
      </svg>
    ),
    description: "Mix of office & remote",
    color: "from-purple-500 to-purple-600",
  },
  {
    value: "Remote",
    label: "Remote",
    icon: ({ className }) => (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
        <circle cx="7" cy="10" r="1" />
        <circle cx="17" cy="10" r="1" />
        <path d="M12 10v2" />
      </svg>
    ),
    description: "Work from anywhere",
    color: "from-green-500 to-green-600",
  },
];

interface WorkEnvironmentSelectorProps {
  selected: string[];
  onChange: (value: string) => void;
}

export default function WorkEnvironmentSelector({
  selected,
  onChange,
}: WorkEnvironmentSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {WORK_ENVIRONMENTS.map((env) => {
        const Icon = env.icon;
        const isSelected = selected.includes(env.value);

        return (
          <motion.button
            key={env.value}
            type="button"
            onClick={() => onChange(env.value)}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={`relative rounded-2xl border-2 transition-all overflow-hidden group ${
              isSelected
                ? "border-brand-500 bg-gradient-to-br from-brand-500/20 to-purple-600/10 shadow-glow-subtle"
                : "border-zinc-700 bg-surface-elevated/40 hover:border-zinc-600 hover:bg-surface-elevated/60"
            }`}
          >
            {/* Background gradient on hover/select */}
            {isSelected && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-purple-600/5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            )}

            <div className="relative p-6 sm:p-8 flex flex-col items-center text-center space-y-4">
              {/* Icon */}
              <motion.div
                className={`p-4 rounded-2xl ${
                  isSelected
                    ? "bg-gradient-to-br from-brand-500/30 to-purple-600/20"
                    : "bg-zinc-800/50 group-hover:bg-zinc-800/70"
                }`}
                whileHover={!isSelected ? { scale: 1.1 } : {}}
                transition={{ duration: 0.2 }}
              >
                <Icon
                  className={`w-8 h-8 sm:w-10 sm:h-10 ${
                    isSelected
                      ? "text-brand-400"
                      : "text-content-muted group-hover:text-content-secondary"
                  }`}
                />
              </motion.div>

              {/* Label */}
              <div>
                <div
                  className={`text-lg sm:text-xl font-bold mb-1 ${
                    isSelected ? "text-white" : "text-content-secondary"
                  }`}
                >
                  {env.label}
                </div>
                <div
                  className={`text-xs sm:text-sm ${
                    isSelected ? "text-content-secondary" : "text-content-muted"
                  }`}
                >
                  {env.description}
                </div>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center"
                >
                  <BrandIcons.Check className="w-4 h-4 text-white" />
                </motion.div>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
