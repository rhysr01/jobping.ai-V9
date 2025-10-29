//  OPTIMIZED EMAIL MODULE EXPORTS - PRODUCTION READY

// Types
export * from './types';

// Core functions - OPTIMIZED VERSION
export { 
  sendWelcomeEmail, 
  sendMatchedJobsEmail, 
  sendBatchEmails,
  EMAIL_PERFORMANCE_METRICS 
} from './sender';

// Production-ready templates (brand aligned + VML fallbacks)
export { 
  createWelcomeEmail, 
  createJobMatchesEmail 
} from './productionReadyTemplates';

// Clients (if needed externally)
export { getResendClient, getSupabaseClient, EMAIL_CONFIG } from './clients';

// Performance monitoring
export { EMAIL_PERFORMANCE_METRICS as performanceMetrics } from './sender';
