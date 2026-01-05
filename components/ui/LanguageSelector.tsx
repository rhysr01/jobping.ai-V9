"use client";

import { motion } from "framer-motion";

interface LanguageSelectorProps {
  languages: string[];
  selected: string[];
  onChange: (value: string) => void;
}

const getLanguageMonogram = (language: string) => {
  const words = language.split(/\s|-/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
};

export default function LanguageSelector({
  languages,
  selected,
  onChange,
}: LanguageSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {languages.map((lang) => {
        const isSelected = selected.includes(lang);
        const monogram = getLanguageMonogram(lang);

        return (
          <motion.button
            key={lang}
            type="button"
            onClick={() => onChange(lang)}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={`relative px-4 py-3.5 rounded-2xl border-2 transition-all font-semibold text-sm overflow-hidden group ${
              isSelected
                ? "border-brand-500 bg-gradient-to-br from-brand-500/20 to-purple-600/10 text-white shadow-glow-subtle"
                : "border-zinc-700 bg-surface-elevated/40 text-content-secondary hover:border-zinc-600 hover:bg-surface-elevated/60"
            }`}
          >
            {/* Background glow on select */}
            {isSelected && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-brand-500/20 to-purple-600/10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            )}

            <div className="relative flex items-center justify-center gap-2">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black tracking-tight transition-shadow ${
                  isSelected
                    ? "bg-gradient-to-br from-brand-500 via-purple-500 to-brand-400 text-white shadow-[0_0_18px_rgba(154,106,255,0.5)]"
                    : "bg-zinc-800/80 text-content-heading"
                }`}
                aria-hidden="true"
              >
                {monogram}
              </span>
              <span className="font-semibold">{lang}</span>

              {/* Selection checkmark */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-glow-subtle"
                >
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="3"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </motion.div>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
