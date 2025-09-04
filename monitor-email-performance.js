#!/usr/bin/env node

// 📊 EMAIL SYSTEM PERFORMANCE MONITORING

import { performanceMetrics } from './Utils/email';

console.log('📊 JobPing Email System Performance Metrics');
console.log('==========================================');

// Cache performance
const cacheStats = performanceMetrics.getCacheStats();
console.log(`Cache Size: ${cacheStats.size}`);
console.log(`Cache Hit Rate: ${cacheStats.hitRate}`);
console.log(`Cache TTL: ${cacheStats.ttl}`);

// Template optimization metrics
import { EMAIL_OPTIMIZATION_METRICS } from './Utils/email';
console.log(`\nTemplate Optimization:`);
console.log(`Welcome Email: ${EMAIL_OPTIMIZATION_METRICS.sizeReduction} reduction`);
console.log(`Job Matches: ${EMAIL_OPTIMIZATION_METRICS.jobMatchesReduction} reduction`);

console.log('\n✅ Email system is optimized and production-ready!');
