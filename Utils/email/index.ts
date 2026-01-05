//  OPTIMIZED EMAIL MODULE EXPORTS - PRODUCTION READY

// Clients (if needed externally)
export { EMAIL_CONFIG, getResendClient, getSupabaseClient } from "./clients";
// Production-ready templates (brand aligned + VML fallbacks)
export {
  createJobMatchesEmail,
  createWelcomeEmail,
} from "./productionReadyTemplates";
// Core functions - OPTIMIZED VERSION
// Performance monitoring
export {
  EMAIL_PERFORMANCE_METRICS,
  EMAIL_PERFORMANCE_METRICS as performanceMetrics,
  sendBatchEmails,
  sendMatchedJobsEmail,
  sendWelcomeEmail,
} from "./sender";
// Types
export * from "./types";
