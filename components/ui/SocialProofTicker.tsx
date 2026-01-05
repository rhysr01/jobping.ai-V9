"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

interface TickerItem {
  city: string | null;
  count: number;
  minutesAgo: number;
  scanning?: boolean;
}

function formatTimeAgo(minutes: number): string {
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

export default function SocialProofTicker() {
  const [isMounted, setIsMounted] = useState(false);
  const [currentItem, setCurrentItem] = useState<TickerItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // Mounting pattern - ensures server and client render same initial state
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchRecentMatches = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(false);
      const response = await fetch("/api/recent-matches");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setCurrentItem(data);
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to fetch recent matches:", err);
      }
      setError(true);
      // Fallback: show scanning message
      setCurrentItem({
        city: null,
        count: 0,
        minutesAgo: 0,
        scanning: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return; // Only fetch after mount
    fetchRecentMatches();
    const interval = setInterval(fetchRecentMatches, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [isMounted, fetchRecentMatches]);

  // Server and client both render this skeleton - no hydration mismatch
  if (!isMounted || (isLoading && !currentItem)) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="flex items-center gap-2 text-content-disabled text-xs"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-pulse" />
        <span className="w-32 h-3 bg-zinc-800 rounded animate-pulse" />
      </motion.div>
    );
  }

  if (!currentItem) return null;

  // Show scanning message when no matches or scanning mode
  if (currentItem.scanning || !currentItem.city || currentItem.count === 0) {
    return (
      <AnimatePresence mode="wait">
        <motion.span
          key="scanning"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2 text-content-muted text-xs"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Scanning 7+ job sources for today's matches...
        </motion.span>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={`${currentItem.city}-${currentItem.count}-${currentItem.minutesAgo}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex items-center gap-2 text-content-disabled text-xs"
      >
        <div
          className={`w-1.5 h-1.5 rounded-full ${error ? "bg-zinc-600" : "bg-emerald-500"} animate-pulse`}
        />
        {currentItem.count} new matches found in {currentItem.city}{" "}
        {formatTimeAgo(currentItem.minutesAgo)} ago
      </motion.span>
    </AnimatePresence>
  );
}
