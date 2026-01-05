"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";

interface CityChipProps {
  city: string;
  isSelected: boolean;
  isDisabled: boolean;
  onToggle: (city: string) => void;
  onRemove?: (city: string) => void; // Optional - for X icon
  className?: string;
}

export function CityChip({
  city,
  isSelected,
  isDisabled,
  onToggle,
  onRemove,
  className = "",
}: CityChipProps) {
  return (
    <motion.button
      type="button"
      onClick={() => !isDisabled && onToggle(city)}
      disabled={isDisabled}
      whileTap={{ scale: 0.97 }}
      className={`
        relative flex items-center snap-center shrink-0 
        min-h-[48px] px-6 rounded-full border-2 
        transition-all touch-manipulation
        ${
          isSelected
            ? "bg-brand-500/20 border-brand-500 text-white pr-12"
            : isDisabled
              ? "bg-zinc-900/40 border-zinc-800 text-zinc-500 cursor-not-allowed"
              : "bg-zinc-900 border-zinc-700 text-zinc-200 hover:border-zinc-600"
        }
        ${className}
      `}
      aria-label={`${city}${isSelected ? " (selected)" : ""}`}
      aria-pressed={isSelected}
      aria-disabled={isDisabled}
    >
      {city}
      {isSelected && onRemove && (
        <motion.button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(city);
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors touch-manipulation"
          aria-label={`Remove ${city}`}
        >
          <X size={16} />
        </motion.button>
      )}
    </motion.button>
  );
}
