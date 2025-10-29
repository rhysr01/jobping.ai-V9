/**
 * Comprehensive Type Definitions for JobPing
 * Centralized type definitions to replace 'any' types throughout the application
 */

// ================================
// API Response Types
// ================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ================================
// Database Query Types
// ================================

export interface DatabaseResponse<T> {
  data: T | null;
  error: any;
  success: boolean;
}

export interface QueryWithTimeoutOptions {
  timeoutMs?: number;
  retries?: number;
}

// ================================
// Matching Engine Types
// ================================

export interface MatchMetrics {
  totalJobs: number;
  distributedJobs: number;
  tierDistribution: Record<string, number>;
  cityDistribution?: Record<string, number>;
  processingTime: number;
  originalJobCount?: number;
  validJobCount?: number;
  selectedJobCount?: number; // Add missing property
  aiMatches?: number;
  ruleBasedMatches?: number;
  cacheHits?: number;
  cacheMisses?: number;
}

export interface MatchProvenance {
  match_algorithm: string;
  ai_latency_ms?: number;
  fallback_reason?: string;
  confidence_score?: number;
  cache_hit?: boolean;
  ai_cost_usd?: number; // Add missing property
}

export interface ParsedMatch {
  job_index: number;
  job_hash: string;
  match_score: number;
  match_reason: string;
  confidence: number;
  isEarlyCareer: boolean;
  locationMatch: boolean;
  skillsMatch: boolean;
  companyMatch: boolean;
}

// ================================
// Email System Types
// ================================

export interface EmailWebhookEvent {
  type: 'bounce' | 'complaint' | 'delivery' | 'open' | 'click';
  email: string;
  timestamp: string;
  details: EmailWebhookDetails;
}

export interface EmailWebhookDetails {
  reason?: string;
  bounce_type?: 'hard' | 'soft';
  bounceType?: 'Permanent' | 'Temporary'; // Legacy support
  complaint_type?: 'spam' | 'abuse';
  user_agent?: string;
  ip_address?: string;
  url?: string;
  messageId?: string; // Legacy support
  metadata?: Record<string, unknown>;
}

// ================================
// Admin & Cleanup Types
// ================================

export interface CleanupLogEntry {
  timestamp: string;
  requestId?: string; // Add missing property
  level: 'info' | 'warn' | 'error';
  message: string;
  context?: CleanupContext;
  metrics?: CleanupMetrics;
}

export interface CleanupContext {
  operation: 'job_cleanup' | 'user_cleanup' | 'match_cleanup';
  batchId: string;
  recordsProcessed: number;
  recordsDeleted: number;
  errors: string[];
}

export interface CleanupMetrics {
  totalJobs: number;
  jobsDeleted: number;
  usersAffected: number;
  processingTimeMs: number;
  safetyThreshold: number;
  batchSize: number;
}

// ================================
// Monitoring & Analytics Types
// ================================

export interface HistoricalMetrics {
  timestamp: string;
  activeUsers: number;
  jobsScraped: number;
  matchesGenerated: number;
  emailsSent: number;
  errorRate: number;
  averageResponseTime: number;
  // Additional properties to match SystemMetrics
  totalUsers?: number;
  recentJobs?: number;
  recentMatches?: number;
  failedEmails?: number;
  pendingJobs?: number;
  processingJobs?: number;
  failedJobs?: number;
  completedJobsToday?: number;
}

export interface PerformanceMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: string;
  userId?: string;
  errorMessage?: string;
}

// ================================
// Utility Types
// ================================

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors: string[];
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
}

// ================================
// Legacy Support Types
// ================================

/**
 * @deprecated Use specific interfaces instead of 'any'
 * This type is provided for gradual migration
 */
export type LegacyAny = Record<string, unknown>;

// ================================
// Type Guards
// ================================

export function isApiResponse<T>(obj: unknown): obj is ApiResponse<T> {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'success' in obj &&
    typeof (obj as ApiResponse).success === 'boolean'
  );
}

export function isMatchMetrics(obj: unknown): obj is MatchMetrics {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'totalJobs' in obj &&
    'distributedJobs' in obj &&
    'processingTime' in obj
  );
}

export function isEmailWebhookEvent(obj: unknown): obj is EmailWebhookEvent {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    'email' in obj &&
    'timestamp' in obj
  );
}
