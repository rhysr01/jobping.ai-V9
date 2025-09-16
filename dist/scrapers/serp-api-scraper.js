"use strict";
// ✅ SERP API Scraper - High Volume Graduate Job Collection
// Follows existing JobPing scraper architecture patterns
// Implements PRD: €75/month plan, 167 daily searches, EU early-career focus
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const utils_js_1 = require("./utils.js");
// ✅ SERP API Configuration - Following PRD specifications
const SERP_CONFIG = {
    baseUrl: 'https://serpapi.com/search',
    apiKey: process.env.SERP_API_KEY || '',
    // Target cities from PRD (7 cities with weights)
    locations: [
        { name: 'London', location: 'London,England,United Kingdom', weight: 3.0 },
        { name: 'Dublin', location: 'Dublin,County Dublin,Ireland', weight: 2.0 },
        { name: 'Berlin', location: 'Berlin,Germany', weight: 2.5 },
        { name: 'Amsterdam', location: 'Amsterdam,Netherlands', weight: 2.0 },
        { name: 'Paris', location: 'Paris,France', weight: 2.5 },
        { name: 'Madrid', location: 'Madrid,Spain', weight: 1.8 },
        { name: 'Zurich', location: 'Zurich,Switzerland', weight: 1.5 }
    ],
    // High-yield search terms from PRD
    searchTerms: {
        volume: [
            'graduate jobs',
            'entry level jobs',
            'junior roles',
            'trainee positions',
            'internships'
        ],
        location: [
            'graduate roles',
            'entry level roles',
            'junior positions',
            'trainee roles'
        ],
        career: [
            'graduate finance analyst London',
            'entry level marketing Berlin',
            'junior consultant Dublin'
        ]
    },
    // Budget optimization from PRD
    dailyLimit: parseInt(process.env.SERP_DAILY_LIMIT || '167'),
    hourlyLimit: process.env.JOBPING_TEST_MODE === '1' ? 3 : parseInt(process.env.SERP_HOURLY_LIMIT || '7'),
    requestDelay: process.env.JOBPING_TEST_MODE === '1' ? 800 : parseInt(process.env.SERP_REQUEST_DELAY || '3000'),
    maxRetries: 2,
    seenJobTTL: 7 * 24 * 60 * 60 * 1000 // 7 days
};
class SerpApiScraper {
    constructor() {
        this.requestCount = 0;
        this.dailyRequestCount = 0;
        this.hourlyRequestCount = 0;
        this.lastRequestTime = 0;
        this.lastDayReset = '';
        this.lastHourReset = Date.now();
        this.seenJobs = new Map();
        this.cityUsageCount = new Map();
        this.resetCounters();
        this.cleanupSeenJobs();
        setInterval(() => this.cleanupSeenJobs(), 12 * 60 * 60 * 1000);
    }
    resetCounters() {
        const today = new Date().toDateString();
        const currentHour = Math.floor(Date.now() / (1000 * 60 * 60));
        const lastHour = Math.floor(this.lastHourReset / (1000 * 60 * 60));
        // Reset daily counter
        if (this.lastDayReset !== today) {
            this.dailyRequestCount = 0;
            this.lastDayReset = today;
            console.log('🔄 Daily SERP API quota reset');
        }
        // Reset hourly counter
        if (currentHour !== lastHour) {
            this.hourlyRequestCount = 0;
            this.lastHourReset = Date.now();
            console.log('🔄 Hourly SERP API quota reset');
        }
    }
    cleanupSeenJobs() {
        const cutoff = Date.now() - SERP_CONFIG.seenJobTTL;
        for (const [jobId, timestamp] of this.seenJobs.entries()) {
            if (timestamp < cutoff) {
                this.seenJobs.delete(jobId);
            }
        }
    }
    canMakeRequest() {
        this.resetCounters();
        return this.dailyRequestCount < SERP_CONFIG.dailyLimit &&
            this.hourlyRequestCount < SERP_CONFIG.hourlyLimit;
    }
    recordRequest() {
        this.dailyRequestCount++;
        this.hourlyRequestCount++;
        console.log(`📊 SERP API Usage: ${this.dailyRequestCount}/${SERP_CONFIG.dailyLimit} daily, ${this.hourlyRequestCount}/${SERP_CONFIG.hourlyLimit} hourly`);
    }
    getNextCity() {
        // Calculate usage-weighted selection (from PRD)
        const cityScores = SERP_CONFIG.locations.map(city => {
            const usage = this.cityUsageCount.get(city.name) || 0;
            const score = city.weight / (usage + 1); // Inverse usage weighting
            return { city, score };
        });
        // Sort by score (highest first)
        cityScores.sort((a, b) => b.score - a.score);
        const selectedCity = cityScores[0].city;
        // Update usage counter
        this.cityUsageCount.set(selectedCity.name, (this.cityUsageCount.get(selectedCity.name) || 0) + 1);
        console.log(`🌍 Selected: ${selectedCity.name} (weight: ${selectedCity.weight})`);
        return selectedCity;
    }
    async throttleRequest() {
        if (!this.canMakeRequest()) {
            throw new Error('SERP API quota exceeded');
        }
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < SERP_CONFIG.requestDelay) {
            const delay = SERP_CONFIG.requestDelay - timeSinceLastRequest;
            console.log(`⏰ SERP API rate limiting: waiting ${Math.round(delay / 1000)}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        this.lastRequestTime = Date.now();
    }
    async makeRequest(params) {
        var _a, _b;
        await this.throttleRequest();
        try {
            const queryParams = new URLSearchParams({
                engine: 'google_jobs',
                q: params.q,
                location: params.location,
                hl: 'en',
                gl: this.getCountryCode(params.location),
                api_key: SERP_CONFIG.apiKey
            });
            const url = `${SERP_CONFIG.baseUrl}?${queryParams.toString()}`;
            console.log(`🔗 SERP API request: "${params.q}" in ${params.location}`);
            const response = await axios_1.default.get(url, {
                headers: {
                    'User-Agent': 'JobPing/1.0 (https://jobping.com)',
                    'Accept': 'application/json'
                },
                timeout: 30000
            });
            this.recordRequest();
            console.log(`📊 SERP API response: ${((_a = response.data.jobs_results) === null || _a === void 0 ? void 0 : _a.length) || 0} jobs found`);
            return response.data;
        }
        catch (error) {
            if (((_b = error.response) === null || _b === void 0 ? void 0 : _b.status) === 429) {
                console.warn('🚫 SERP API rate limited, implementing exponential backoff');
                await new Promise(resolve => setTimeout(resolve, SERP_CONFIG.requestDelay * 2));
                return this.makeRequest(params);
            }
            console.error('❌ SERP API error:', error.message);
            if (error.response) {
                console.error('❌ Response status:', error.response.status);
                console.error('❌ Response data:', error.response.data);
            }
            throw error;
        }
    }
    getCountryCode(location) {
        if (location.includes('United Kingdom') || location.includes('London'))
            return 'gb';
        if (location.includes('Ireland') || location.includes('Dublin'))
            return 'ie';
        if (location.includes('Germany') || location.includes('Berlin'))
            return 'de';
        if (location.includes('Netherlands') || location.includes('Amsterdam'))
            return 'nl';
        if (location.includes('France') || location.includes('Paris'))
            return 'fr';
        if (location.includes('Spain') || location.includes('Madrid'))
            return 'es';
        if (location.includes('Switzerland') || location.includes('Zurich'))
            return 'ch';
        return 'gb'; // Default to UK
    }
    convertToIngestJob(serpJob, fallbackLocation) {
        var _a, _b, _c;
        const applyLink = ((_b = (_a = serpJob.apply_options) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.link) || serpJob.apply_link || serpJob.link || '';
        const desc = serpJob.description || '';
        const loc = serpJob.location || fallbackLocation || '';
        return {
            title: serpJob.title || '',
            company: serpJob.company_name || '',
            location: loc,
            description: desc,
            url: applyLink,
            posted_at: ((_c = serpJob.detected_extensions) === null || _c === void 0 ? void 0 : _c.posted_at) || new Date().toISOString(),
            source: 'serp-api'
        };
    }
    isEULocation(job) {
        const { isEU } = (0, utils_js_1.parseLocation)(job.location);
        return isEU;
    }
    isRemoteJob(job) {
        const { isRemote } = (0, utils_js_1.parseLocation)(job.location);
        return isRemote;
    }
    generateJobHash(job) {
        var _a, _b, _c;
        return `${((_a = job.title) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || ''}-${((_b = job.company_name) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || ''}-${((_c = job.location) === null || _c === void 0 ? void 0 : _c.toLowerCase()) || ''}`.replace(/\s+/g, '-');
    }
    async searchJobs(query, location) {
        const jobs = [];
        console.log(`🔍 Searching SERP API: "${query}" in ${location}`);
        try {
            const response = await this.makeRequest({
                q: query,
                location: location
            });
            if (!response.jobs_results || response.jobs_results.length === 0) {
                console.log(`📭 No jobs found for "${query}" in ${location}`);
                return jobs;
            }
            for (const serpJob of response.jobs_results) {
                const jobHash = this.generateJobHash(serpJob);
                if (!this.seenJobs.has(jobHash)) {
                    this.seenJobs.set(jobHash, Date.now());
                    try {
                        const ingestJob = this.convertToIngestJob(serpJob, location);
                        // Apply validation
                        const validation = (0, utils_js_1.validateJob)(ingestJob);
                        if (!validation.valid) {
                            console.log(`🚫 Invalid job: ${ingestJob.title} at ${ingestJob.company}`);
                            continue;
                        }
                        // Apply early career filtering
                        if (!(0, utils_js_1.classifyEarlyCareer)(ingestJob)) {
                            console.log(`🚫 Skipped senior: ${ingestJob.title} at ${ingestJob.company}`);
                            continue;
                        }
                        // Apply EU location filtering
                        if (!this.isEULocation(ingestJob)) {
                            console.log(`🚫 Skipped non-EU: ${ingestJob.title} at ${ingestJob.company} (${ingestJob.location})`);
                            continue;
                        }
                        // Respect user preference: exclude remote jobs
                        if (this.isRemoteJob(ingestJob)) {
                            console.log(`🚫 Skipped remote: ${ingestJob.title} at ${ingestJob.company} (${ingestJob.location})`);
                            continue;
                        }
                        jobs.push(ingestJob);
                        console.log(`✅ Early-career EU: ${ingestJob.title} at ${ingestJob.company} (${ingestJob.location})`);
                    }
                    catch (error) {
                        console.warn(`Failed to process job ${jobHash}:`, error);
                    }
                }
            }
        }
        catch (error) {
            console.error(`❌ Error searching SERP API for "${query}" in ${location}:`, error.message);
        }
        return jobs;
    }
    async scrapeAllLocations() {
        if (!SERP_CONFIG.apiKey) {
            console.log('⚠️ SERP_API_KEY missing; skipping SERP API run');
            return { jobs: [], metrics: { error: 'API key missing' } };
        }
        const allJobs = [];
        const metrics = {
            locationsProcessed: 0,
            totalJobsFound: 0,
            earlyCareerJobs: 0,
            requestsUsed: 0,
            dailyBudgetRemaining: SERP_CONFIG.dailyLimit,
            hourlyBudgetRemaining: SERP_CONFIG.hourlyLimit,
            errors: 0,
            startTime: new Date().toISOString()
        };
        console.log(`🚀 Starting SERP API scraping session`);
        console.log(`📊 Quota available: ${SERP_CONFIG.dailyLimit - this.dailyRequestCount} daily, ${SERP_CONFIG.hourlyLimit - this.hourlyRequestCount} hourly`);
        try {
            // Distribute searches across search categories (from PRD)
            const searchCategories = Object.entries(SERP_CONFIG.searchTerms);
            const searchesPerCategory = Math.floor(SERP_CONFIG.dailyLimit / searchCategories.length);
            for (const [category, queries] of searchCategories) {
                if (!this.canMakeRequest()) {
                    console.log('⚠️ Rate limit reached, stopping searches');
                    break;
                }
                console.log(`\n🔍 Searching ${category} jobs (${Math.min(searchesPerCategory, queries.length)} searches)`);
                for (let i = 0; i < Math.min(searchesPerCategory, queries.length) && this.canMakeRequest(); i++) {
                    const city = this.getNextCity();
                    const query = queries[i];
                    try {
                        const jobs = await this.searchJobs(query, city.location);
                        allJobs.push(...jobs);
                        metrics.locationsProcessed++;
                    }
                    catch (error) {
                        const errorMsg = `Search failed for "${query}" in ${city.name}: ${error.message}`;
                        console.error('❌', errorMsg);
                        metrics.errors++;
                    }
                }
            }
        }
        catch (error) {
            console.error(`❌ Error in SERP API scraping:`, error.message);
            metrics.errors++;
        }
        const uniqueJobs = this.deduplicateJobs(allJobs);
        metrics.totalJobsFound = uniqueJobs.length;
        metrics.earlyCareerJobs = uniqueJobs.length;
        metrics.requestsUsed = this.requestCount;
        metrics.dailyBudgetRemaining = SERP_CONFIG.dailyLimit - this.dailyRequestCount;
        metrics.hourlyBudgetRemaining = SERP_CONFIG.hourlyLimit - this.hourlyRequestCount;
        console.log(`\n📊 SERP API scraping complete:`);
        console.log(`   📍 Locations processed: ${metrics.locationsProcessed}`);
        console.log(`   📋 Jobs found: ${metrics.totalJobsFound}`);
        console.log(`   📞 API calls used: ${metrics.requestsUsed}`);
        console.log(`   📅 Daily budget remaining: ${metrics.dailyBudgetRemaining}`);
        console.log(`   ⏰ Hourly budget remaining: ${metrics.hourlyBudgetRemaining}`);
        return { jobs: uniqueJobs, metrics };
    }
    deduplicateJobs(jobs) {
        const seen = new Set();
        return jobs.filter(job => {
            const key = `${job.title.toLowerCase()}-${job.company.toLowerCase()}-${job.location.toLowerCase()}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
    getStatus() {
        this.resetCounters();
        return {
            isRunning: false,
            locationsSupported: SERP_CONFIG.locations.length,
            requestsToday: this.dailyRequestCount,
            requestsThisHour: this.hourlyRequestCount,
            dailyBudget: SERP_CONFIG.dailyLimit,
            hourlyBudget: SERP_CONFIG.hourlyLimit,
            dailyBudgetRemaining: SERP_CONFIG.dailyLimit - this.dailyRequestCount,
            hourlyBudgetRemaining: SERP_CONFIG.hourlyLimit - this.hourlyRequestCount,
            seenJobsCount: this.seenJobs.size,
            lastRequestTime: new Date(this.lastRequestTime).toISOString(),
            apiKeyConfigured: !!SERP_CONFIG.apiKey,
            cityUsageStats: Object.fromEntries(this.cityUsageCount)
        };
    }
    getDailyStats() {
        this.resetCounters();
        return {
            requestsUsed: this.dailyRequestCount,
            dailyBudgetRemaining: SERP_CONFIG.dailyLimit - this.dailyRequestCount,
            hourlyBudgetRemaining: SERP_CONFIG.hourlyLimit - this.hourlyRequestCount,
            seenJobsCount: this.seenJobs.size
        };
    }
}
exports.default = SerpApiScraper;
