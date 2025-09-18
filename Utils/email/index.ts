// 🚀 OPTIMIZED EMAIL MODULE EXPORTS - PRODUCTION READY

// Types
export * from './types';

// Core functions - OPTIMIZED VERSION
export { 
  sendWelcomeEmail, 
  sendMatchedJobsEmail, 
  sendBatchEmails,
  EMAIL_PERFORMANCE_METRICS 
} from './optimizedSender';

// Templates - BRAND CONSISTENT VERSION (Black & White Design)
export { 
  createWelcomeEmail, 
  createJobMatchesEmail,
  EMAIL_BRAND_METRICS 
} from './brandConsistentTemplates';

// Clients (if needed externally)
export { getResendClient, getSupabaseClient, EMAIL_CONFIG } from './clients';

// Feedback system integration
export { EmailFeedbackIntegration, emailFeedbackHelpers } from './feedbackIntegration';

// Email preview system
export { EmailPreviewSystem, emailPreview } from './emailPreview';

// Performance monitoring
export { EMAIL_PERFORMANCE_METRICS as performanceMetrics } from './optimizedSender';
