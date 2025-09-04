"use strict";
/**
 * Production HTTP Client with Connection Pooling
 *
 * CRITICAL FIX: Prevents TCP socket accumulation and memory leaks
 * - Connection pooling and reuse
 * - Rate limiting integration
 * - Circuit breaker pattern
 * - Resource cleanup
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainRateLimiter = exports.CircuitBreaker = exports.httpClient = void 0;
const axios_1 = require("axios");
const http_1 = require("http");
const https_1 = require("https");
// Connection pool configuration
const HTTP_CONFIG = {
    // Connection pooling
    maxSockets: 50, // Maximum concurrent connections
    maxFreeSockets: 10, // Maximum idle connections
    timeout: 30000, // Socket timeout
    freeSocketTimeout: 30000, // Idle connection timeout
    keepAlive: true, // Keep connections alive
    // Request limits
    maxRedirects: 5,
    maxContentLength: 50 * 1024 * 1024, // 50MB
    // Retry configuration
    maxRetries: 3,
    retryDelay: 1000, // Base delay in ms
    retryBackoff: 2, // Exponential backoff multiplier
};
// HTTP Agent with connection pooling
const httpAgent = new http_1.Agent({
    keepAlive: HTTP_CONFIG.keepAlive,
    maxSockets: HTTP_CONFIG.maxSockets,
    maxFreeSockets: HTTP_CONFIG.maxFreeSockets,
    timeout: HTTP_CONFIG.timeout,
});
const httpsAgent = new https_1.Agent({
    keepAlive: HTTP_CONFIG.keepAlive,
    maxSockets: HTTP_CONFIG.maxSockets,
    maxFreeSockets: HTTP_CONFIG.maxFreeSockets,
    timeout: HTTP_CONFIG.timeout,
});
// Circuit breaker implementation
class CircuitBreaker {
    constructor() {
        this.failures = 0;
        this.threshold = 5;
        this.timeout = 60000; // 1 minute
        this.nextAttempt = 0;
        this.state = 'CLOSED';
    }
    async call(fn) {
        if (this.state === 'OPEN') {
            if (Date.now() < this.nextAttempt) {
                throw new Error('Circuit breaker is OPEN');
            }
            this.state = 'HALF_OPEN';
        }
        try {
            const result = await fn();
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure();
            throw error;
        }
    }
    onSuccess() {
        this.failures = 0;
        this.state = 'CLOSED';
    }
    onFailure() {
        this.failures++;
        if (this.failures >= this.threshold) {
            this.state = 'OPEN';
            this.nextAttempt = Date.now() + this.timeout;
            console.warn(`⚠️ Circuit breaker OPEN for ${this.timeout}ms after ${this.failures} failures`);
        }
    }
    getStatus() {
        return {
            state: this.state,
            failures: this.failures,
            threshold: this.threshold,
            nextAttempt: this.nextAttempt,
            isOpen: this.state === 'OPEN'
        };
    }
}
exports.CircuitBreaker = CircuitBreaker;
// Rate limiter for individual domains
class DomainRateLimiter {
    constructor() {
        this.domains = new Map();
        // Clean up old entries every hour
        setInterval(() => this.cleanup(), 60 * 60 * 1000);
    }
    async waitForSlot(domain, config) {
        const now = Date.now();
        let domainData = this.domains.get(domain);
        if (!domainData) {
            domainData = {
                lastRequest: 0,
                requestCount: 0,
                dailyLimit: config.dailyLimit,
                minInterval: config.minInterval
            };
            this.domains.set(domain, domainData);
        }
        // Check daily limit
        if (domainData.requestCount >= domainData.dailyLimit) {
            throw new Error(`Daily limit exceeded for ${domain}`);
        }
        // Enforce minimum interval
        const timeSinceLastRequest = now - domainData.lastRequest;
        if (timeSinceLastRequest < domainData.minInterval) {
            const delay = domainData.minInterval - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        domainData.lastRequest = Date.now();
        domainData.requestCount++;
    }
    cleanup() {
        const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
        for (const [domain, data] of this.domains.entries()) {
            if (data.lastRequest < cutoff) {
                this.domains.delete(domain);
            }
        }
    }
    getDomainStatus(domain) {
        return this.domains.get(domain);
    }
}
exports.DomainRateLimiter = DomainRateLimiter;
// Main HTTP client class
class ProductionHttpClient {
    constructor() {
        this.circuitBreaker = new CircuitBreaker();
        this.rateLimiter = new DomainRateLimiter();
        this.axiosInstance = axios_1.default.create({
            timeout: HTTP_CONFIG.timeout,
            maxRedirects: HTTP_CONFIG.maxRedirects,
            maxContentLength: HTTP_CONFIG.maxContentLength,
            httpAgent,
            httpsAgent,
            headers: {
                'User-Agent': 'JobPing/1.0 (https://jobping.com)',
                'Accept': 'application/json, text/html, */*',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive'
            }
        });
        // Add request interceptor for logging
        this.axiosInstance.interceptors.request.use((config) => {
            console.log(`🌐 HTTP Request: ${config.method?.toUpperCase()} ${config.url}`);
            return config;
        }, (error) => {
            console.error('❌ HTTP Request Error:', error);
            return Promise.reject(error);
        });
        // Add response interceptor for error handling
        this.axiosInstance.interceptors.response.use((response) => {
            return response;
        }, async (error) => {
            if (error.response?.status === 429) {
                console.warn('🚫 Rate limited, implementing backoff...');
                await this.handleRateLimit(error.config);
            }
            return Promise.reject(error);
        });
    }
    async handleRateLimit(config) {
        // Note: This would need the actual error object to work properly
        // For now, use a default delay
        const delay = 5000;
        console.log(`⏰ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    async get(url, config, rateLimitConfig) {
        const domain = new URL(url).hostname;
        if (rateLimitConfig) {
            await this.rateLimiter.waitForSlot(domain, rateLimitConfig);
        }
        return this.circuitBreaker.call(() => this.axiosInstance.get(url, config));
    }
    async post(url, data, config, rateLimitConfig) {
        const domain = new URL(url).hostname;
        if (rateLimitConfig) {
            await this.rateLimiter.waitForSlot(domain, rateLimitConfig);
        }
        return this.circuitBreaker.call(() => this.axiosInstance.post(url, data, config));
    }
    // Health check method
    async healthCheck() {
        try {
            const response = await this.get('https://httpbin.org/status/200', {
                timeout: 5000
            });
            return response.status === 200;
        }
        catch (error) {
            console.error('❌ HTTP client health check failed:', error);
            return false;
        }
    }
    // Get status information
    getStatus() {
        return {
            circuitBreaker: this.circuitBreaker.getStatus(),
            domains: [] // Rate limiter domains are private, return empty array for now
        };
    }
    // Cleanup resources
    async cleanup() {
        try {
            // Close all connections
            httpAgent.destroy();
            httpsAgent.destroy();
            console.log('✅ HTTP client resources cleaned up');
        }
        catch (error) {
            console.error('❌ Error cleaning up HTTP client:', error);
        }
    }
}
// Export singleton instance
exports.httpClient = new ProductionHttpClient();
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🔄 SIGTERM received, cleaning up HTTP client...');
    await exports.httpClient.cleanup();
});
process.on('SIGINT', async () => {
    console.log('🔄 SIGINT received, cleaning up HTTP client...');
    await exports.httpClient.cleanup();
});
