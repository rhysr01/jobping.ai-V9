"use client";

import { motion } from "framer-motion";

interface CustomScanTriggerProps {
  scanId: string;
  estimatedTime: string;
  message: string;
  userEmail: string;
}

export default function CustomScanTrigger({
  scanId,
  estimatedTime,
  message,
  userEmail,
}: CustomScanTriggerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-brand-500/10 to-purple-600/10 border-2 border-brand-500/30 rounded-2xl p-8 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-brand-500/20 flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-8 h-8 text-brand-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <title>Checkmark icon</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-white mb-3">
        Custom Scan Triggered
      </h2>

      <p className="text-zinc-300 mb-6 max-w-md mx-auto">
        {message} Check your email ({userEmail}) in {estimatedTime} for your
        personalized matches.
      </p>

      <div className="flex items-center justify-center gap-4 text-sm text-zinc-400">
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <title>Clock icon</title>
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
          Scan ID: {scanId.substring(0, 8)}
        </span>
      </div>
    </motion.div>
  );
}
