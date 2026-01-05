"use client";

import { AnimatePresence, motion } from "framer-motion";
import Button from "./Button";

interface SimilarMatch {
  job_hash: string;
  title: string;
  company: string;
  location: string;
  job_url: string;
  match_score: number;
  match_reason: string;
}

interface JobClosedModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalJob: {
    title: string;
    company: string;
    location: string;
  };
  similarMatches: SimilarMatch[];
  message: string;
}

export default function JobClosedModal({
  isOpen,
  onClose,
  originalJob,
  similarMatches,
  message,
}: JobClosedModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.button
            type="button"
            aria-label="Close modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="p-6 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-orange-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Job No Longer Available
                    </h2>
                    <p className="text-sm text-zinc-400 mt-1">
                      {originalJob.company} • {originalJob.title}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-zinc-300 mb-6">{message}</p>

                {/* Similar Matches */}
                <div className="space-y-4">
                  {similarMatches.map((match) => (
                    <motion.div
                      key={match.job_hash}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700 hover:border-brand-500/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white mb-1">
                            {match.title}
                          </h3>
                          <p className="text-sm text-zinc-400 mb-2">
                            {match.company} • {match.location}
                          </p>
                          <p className="text-xs text-zinc-500 line-clamp-2">
                            {match.match_reason}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs px-2 py-1 rounded bg-brand-500/20 text-brand-300">
                              {match.match_score}% Match
                            </span>
                          </div>
                        </div>
                        <Button
                          onClick={() => {
                            window.open(
                              match.job_url,
                              "_blank",
                              "noopener,noreferrer",
                            );
                          }}
                          variant="primary"
                          size="sm"
                        >
                          Apply →
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {similarMatches.length === 0 && (
                  <p className="text-zinc-400 text-center py-8">
                    No similar matches found. Check back later for new
                    opportunities!
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-zinc-800 flex justify-end">
                <Button onClick={onClose} variant="secondary">
                  Close
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
