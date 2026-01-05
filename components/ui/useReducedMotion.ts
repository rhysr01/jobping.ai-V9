"use client";

import { useEffect, useState } from "react";

/**
 * Hook to detect user's preference for reduced motion
 * Respects prefers-reduced-motion media query
 */
export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReduced(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) =>
        setPrefersReduced(e.matches);
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
    return undefined;
  }, []);

  return prefersReduced;
}
