/**
 * Web Vitals tracking for Core Web Vitals monitoring
 */

export function reportWebVitals(metric: any) {
  // Send to analytics endpoint in production
  if (process.env.NODE_ENV === 'production') {
    // Send to analytics endpoint
    fetch('/api/analytics/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metric),
      keepalive: true,
    }).catch(() => {
      // Silently fail if analytics endpoint doesn't exist
    });
  }
  
  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Web Vitals]', metric.name, metric.value, metric.id);
  }
}

// Initialize Web Vitals tracking
if (typeof window !== 'undefined') {
  // Dynamic import to avoid SSR issues
  import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB, onINP }) => {
    onCLS(reportWebVitals);
    onFID(reportWebVitals);
    onFCP(reportWebVitals);
    onLCP(reportWebVitals);
    onTTFB(reportWebVitals);
    onINP(reportWebVitals);
  }).catch(() => {
    // Silently fail if web-vitals is not installed
  });
}

