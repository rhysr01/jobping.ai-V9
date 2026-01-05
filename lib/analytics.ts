/**
 * Unified analytics tracking
 * Sends events to both our analytics table and Google Analytics 4
 */

export function trackEvent(event: string, properties?: Record<string, any>) {
  // Send to your analytics table
  fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event,
      properties,
      timestamp: new Date().toISOString(),
      url: typeof window !== "undefined" ? window.location.href : "",
    }),
  }).catch((err) => {
    // Silent fail - analytics shouldn't block user flow
    console.error("[Analytics] Tracking failed:", err);
  });

  // Also send to Google Analytics if available
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", event, properties);
  }
}
