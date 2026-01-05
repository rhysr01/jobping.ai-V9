// � EMAIL TYPES & INTERFACES - WITH FEEDBACK SYSTEM INTEGRATION

export interface EmailJobCard {
  job: {
    title?: string;
    company?: string;
    location?: string;
    job_hash?: string;
    user_email?: string;
    [key: string]: any;
  };
  matchResult: {
    match_score?: number;
    confidence?: number;
    [key: string]: any;
  };
  isConfident: boolean;
  isPromising: boolean;
  hasManualLocator: boolean;
  searchHint?: string;
}

export interface EmailDeliveryMetrics {
  emailsSent: number;
  emailsFailed: number;
  matchesSelectedTotal: number;
  matchesConfidentCount: number;
  matchesPromisingCount: number;
  unknownLocationPercentage: number;
  careerUnknownPercentage: number;
  p95Latency: number;
  cacheHitRate: number;
}

export interface EmailFeedback {
  userEmail: string;
  jobHash: string;
  verdict: "relevant" | "not_relevant";
  timestamp: Date;
  reason?: string;
}

export interface DeliverySafeguards {
  deduplicateWindowHours: number;
  maxPromisingPercentage: number;
  minConfidentMatches: number;
  maxPromisingPerEmail: number;
}

export interface EmailFeatureFlags {
  includePromising: boolean;
  includeLocatorManual: boolean;
  strictVisaFilter: boolean;
  platformKillSwitches: Record<string, boolean>;
}

export interface EmailConfig {
  from: string;
  subject: string;
  maxRetries: number;
  retryDelay: number;
}
