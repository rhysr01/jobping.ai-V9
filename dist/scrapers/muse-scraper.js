"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// ✅ FIXED Muse Scraper - Optimized for EU Early Career Jobs
const axios_1 = __importDefault(require("axios"));
const utils_js_1 = require("./utils.js");
const smart_strategies_js_1 = require("./smart-strategies.js");
// ✅ OPTIMIZED Muse API Configuration
const MUSE_CONFIG = {
    baseUrl: 'https://www.themuse.com/api/public/jobs',
    apiKey: process.env.MUSE_API_KEY || '', // Optional but recommended
    // ✅ FIXED: Use EU cities that actually have jobs in Muse
    locations: [
        'Dublin, Ireland',
        'Berlin, Germany',
        'Amsterdam, Netherlands',
        'Paris, France',
        'Madrid, Spain',
        'Munich, Germany',
        'Stockholm, Sweden',
        'Zurich, Switzerland',
        'Copenhagen, Denmark',
        'Barcelona, Spain',
        'Milan, Italy'
    ],
    // ✅ CORRECTED: Use exact category names from Muse API
    categories: [
        'Engineering',
        'Data Science',
        'Business & Strategy',
        'Marketing & PR',
        'Sales',
        'Finance',
        'Operations',
        'Product',
        'Design',
        'Customer Success',
        'Editorial',
        'HR & Recruiting'
    ],
    // ✅ CORRECTED: Use only valid Muse API levels
    levels: [
        'Entry Level',
        'Internship',
        'Mid Level' // Some mid-level roles are still early career
    ],
    // ✅ ADDED: Search terms to find more early-career jobs
    searchTerms: [
        'graduate',
        'junior',
        'trainee',
        'entry level',
        'intern',
        'associate',
        'new grad',
        'recent graduate',
        'campus hire'
    ],
    // ✅ OPTIMIZED: Better rate limiting for 500 req/hour limit
    requestInterval: 8000, // 8 seconds = 450 requests/hour (safe buffer)
    maxRequestsPerHour: 450, // Leave buffer under 500 limit
    seenJobTTL: 72 * 60 * 60 * 1000, // 72 hours
    resultsPerPage: 20, // Max for Muse API
    // Prefer API early-career filter; will fallback to local regex if sparse
    preferApiEarlyCareer: true,
    apiEarlyLevels: ['Entry Level', 'Internship']
};
const TRACK_CATEGORIES = {
    A: ['Engineering', 'Data Science'], // Tech focus
    B: ['Business & Strategy', 'Finance'], // Business focus  
    C: ['Marketing & PR', 'Sales'], // Growth focus
    D: ['Product', 'Design'], // Product focus
    E: ['Operations', 'Customer Success'] // Operations focus
};
const TRACK_LEVELS = {
    A: ['Entry Level', 'Internship'],
    B: ['Entry Level', 'Mid Level'],
    C: ['Entry Level', 'Internship'],
    D: ['Entry Level', 'Mid Level'],
    E: ['Entry Level', 'Internship']
};
class MuseScraper {
    constructor() {
        this.requestCount = 0;
        this.hourlyRequestCount = 0;
        this.lastRequestTime = 0;
        this.lastHourReset = Date.now();
        this.seenJobs = new Map();
        this.cleanupSeenJobs();
        setInterval(() => this.cleanupSeenJobs(), 4 * 60 * 60 * 1000);
    }
    cleanupSeenJobs() {
        const cutoff = Date.now() - MUSE_CONFIG.seenJobTTL;
        for (const [jobId, timestamp] of this.seenJobs.entries()) {
            if (timestamp < cutoff) {
                this.seenJobs.delete(jobId);
            }
        }
    }
    // ✅ FIXED: EU location detection for Muse jobs (comprehensive)
    isEULocation(job) {
        var _a;
        const location = ((_a = job.location) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
        const euPatterns = [
            // Countries
            'united kingdom', 'uk', 'great britain', 'britain', 'england', 'scotland', 'wales',
            'ireland', 'republic of ireland', 'ie',
            'germany', 'deutschland', 'de',
            'france', 'fr', 'république française',
            'spain', 'españa', 'es',
            'italy', 'italia', 'it',
            'netherlands', 'holland', 'nl', 'nederland',
            'belgium', 'belgique', 'belgië', 'be',
            'austria', 'österreich', 'at',
            'switzerland', 'schweiz', 'suisse', 'ch',
            'sweden', 'sverige', 'se',
            'denmark', 'danmark', 'dk',
            'norway', 'norge', 'no',
            'finland', 'suomi', 'fi',
            'poland', 'polska', 'pl',
            'czech republic', 'czechia', 'cz',
            'hungary', 'magyarország', 'hu',
            'portugal', 'pt',
            'greece', 'ελλάδα', 'gr',
            'romania', 'românia', 'ro',
            'bulgaria', 'българия', 'bg',
            'croatia', 'hrvatska', 'hr',
            'slovenia', 'slovenija', 'si',
            'slovakia', 'slovensko', 'sk',
            'estonia', 'eesti', 'ee',
            'latvia', 'latvija', 'lv',
            'lithuania', 'lietuva', 'lt',
            'luxembourg', 'lëtzebuerg', 'lu',
            'malta', 'mt',
            'cyprus', 'κύπρος', 'cy',
            // Major EU Cities
            'london', 'manchester', 'birmingham', 'leeds', 'glasgow', 'edinburgh',
            'dublin', 'cork', 'galway',
            'berlin', 'munich', 'hamburg', 'frankfurt', 'cologne', 'stuttgart',
            'paris', 'lyon', 'marseille', 'toulouse', 'nice',
            'madrid', 'barcelona', 'valencia', 'seville', 'bilbao',
            'rome', 'milan', 'naples', 'turin', 'florence', 'bologna',
            'amsterdam', 'rotterdam', 'the hague', 'utrecht',
            'brussels', 'antwerp', 'ghent',
            'vienna', 'salzburg', 'graz',
            'zurich', 'geneva', 'basel', 'bern',
            'stockholm', 'gothenburg', 'malmö',
            'copenhagen', 'aarhus', 'odense',
            'oslo', 'bergen', 'trondheim',
            'helsinki', 'tampere', 'turku',
            'warsaw', 'krakow', 'gdansk', 'wroclaw',
            'prague', 'brno', 'ostrava',
            'budapest', 'debrecen', 'szeged',
            'lisbon', 'porto', 'braga',
            'athens', 'thessaloniki', 'patras',
            'bucharest', 'cluj-napoca', 'timisoara',
            'sofia', 'plovdiv', 'varna'
        ];
        // Check if location contains any EU pattern
        return euPatterns.some(pattern => location.includes(pattern));
    }
    resetHourlyCount() {
        const now = Date.now();
        if (now - this.lastHourReset > 60 * 60 * 1000) {
            this.hourlyRequestCount = 0;
            this.lastHourReset = now;
        }
    }
    getTrackForRun() {
        const hour = new Date().getHours();
        const tracks = ['A', 'B', 'C', 'D', 'E'];
        return tracks[hour % 5];
    }
    async throttleRequest() {
        this.resetHourlyCount();
        if (this.hourlyRequestCount >= MUSE_CONFIG.maxRequestsPerHour) {
            console.log('⏰ Hourly rate limit reached, waiting...');
            const waitTime = 60 * 60 * 1000 - (Date.now() - this.lastHourReset);
            if (waitTime > 0) {
                await new Promise(resolve => setTimeout(resolve, waitTime));
                this.resetHourlyCount();
            }
        }
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < MUSE_CONFIG.requestInterval) {
            const delay = MUSE_CONFIG.requestInterval - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        this.lastRequestTime = Date.now();
    }
    async makeRequest(params) {
        var _a, _b, _c, _d;
        await this.throttleRequest();
        try {
            // ✅ ENHANCED: Build proper query parameters for Muse API with search terms
            const queryParams = {
                page: params.page || 1,
                descending: true
            };
            if (params.location) {
                queryParams.location = params.location;
            }
            if (params.categories && params.categories.length > 0) {
                queryParams.category = params.categories.join(',');
            }
            if (params.levels && params.levels.length > 0) {
                queryParams.level = params.levels.join(',');
            }
            // ✅ ADDED: Support for search terms to find more early-career jobs
            if (params.search) {
                queryParams.search = params.search;
            }
            if (MUSE_CONFIG.apiKey) {
                queryParams.api_key = MUSE_CONFIG.apiKey;
            }
            console.log(`🔗 Muse API request: ${MUSE_CONFIG.baseUrl}`, queryParams);
            const response = await axios_1.default.get(MUSE_CONFIG.baseUrl, {
                params: queryParams,
                headers: {
                    'User-Agent': 'JobPing/1.0 (https://jobping.com)',
                    'Accept': 'application/json'
                },
                timeout: 15000
            });
            this.requestCount++;
            this.hourlyRequestCount++;
            console.log(`📊 Muse API response: ${((_a = response.data.results) === null || _a === void 0 ? void 0 : _a.length) || 0} jobs found`);
            return response.data;
        }
        catch (error) {
            if (((_b = error.response) === null || _b === void 0 ? void 0 : _b.status) === 429) {
                console.warn('🚫 Rate limited by The Muse, backing off...');
                await new Promise(resolve => setTimeout(resolve, 10000));
                return this.makeRequest(params);
            }
            if (((_c = error.response) === null || _c === void 0 ? void 0 : _c.status) === 400) {
                console.warn('⚠️ Bad request to The Muse API:', error.response.data);
                console.warn('⚠️ Parameters used:', params);
                throw new Error(`Bad request: ${((_d = error.response.data) === null || _d === void 0 ? void 0 : _d.message) || 'Invalid parameters'}`);
            }
            console.error('❌ Muse API error:', error.message);
            if (error.response) {
                console.error('❌ Response status:', error.response.status);
                console.error('❌ Response data:', error.response.data);
            }
            throw error;
        }
    }
    convertToIngestJob(museJob) {
        // ✅ IMPROVED: Better location handling
        let location = 'Remote';
        if (museJob.locations && museJob.locations.length > 0) {
            location = museJob.locations[0].name;
        }
        else if (museJob.company.locations && museJob.company.locations.length > 0) {
            location = museJob.company.locations[0].name;
        }
        return {
            title: museJob.name,
            company: museJob.company.name,
            location: location,
            description: this.stripHtmlTags(museJob.contents),
            url: museJob.refs.landing_page,
            posted_at: museJob.publication_date,
            source: 'themuse'
        };
    }
    stripHtmlTags(html) {
        if (!html)
            return '';
        return html
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
            .replace(/&amp;/g, '&') // Replace &amp; with &
            .replace(/&lt;/g, '<') // Replace &lt; with <
            .replace(/&gt;/g, '>') // Replace &gt; with >
            .replace(/&quot;/g, '"') // Replace &quot; with "
            .replace(/&#39;/g, "'") // Replace &#39; with '
            .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
            .trim();
    }
    async fetchLocationJobs(location, categories, levels) {
        const jobs = [];
        // Use smart strategies for date filtering and pagination
        const smartMaxDays = (0, smart_strategies_js_1.withFallback)(() => (0, smart_strategies_js_1.getSmartDateStrategy)('muse'), '7');
        const pagination = (0, smart_strategies_js_1.withFallback)(() => (0, smart_strategies_js_1.getSmartPaginationStrategy)('muse'), { startPage: 1, endPage: 5 });
        console.log(`📍 Scraping ${location} for categories: ${categories.join(', ')}, levels: ${levels.join(', ')} (max ${smartMaxDays} days, pages ${pagination.startPage}-${pagination.endPage})`);
        try {
            // ✅ ENHANCED: Search with both levels and search terms for better early-career discovery
            // First, search by levels (Entry Level, Internship, Mid Level)
            const levelJobs = await this.searchWithParams(location, categories, levels, null, smartMaxDays, pagination);
            jobs.push(...levelJobs);
            // Then, search with early-career terms to catch jobs that might not be tagged with levels
            for (const searchTerm of MUSE_CONFIG.searchTerms) {
                const termJobs = await this.searchWithParams(location, categories, [], searchTerm, smartMaxDays, pagination);
                jobs.push(...termJobs);
            }
            // Remove duplicates based on job URL
            const uniqueJobs = jobs.filter((job, index, self) => index === self.findIndex(j => j.url === job.url));
            console.log(`✅ ${location}: ${uniqueJobs.length} unique early-career jobs found (${jobs.length} total before deduplication)`);
            return uniqueJobs;
        }
        catch (error) {
            console.error(`❌ Error fetching jobs for ${location}:`, error.message);
            return [];
        }
    }
    async searchWithParams(location, categories, levels, searchTerm, smartMaxDays, pagination) {
        const jobs = [];
        try {
            // ✅ Only include non-empty parameters to avoid API issues
            const params = {
                location: location,
                page: 1
            };
            // Add date filtering if Muse API supports it
            if (smartMaxDays && smartMaxDays !== '7') {
                params.max_days_old = smartMaxDays;
            }
            // Only add categories if not empty
            if (categories.length > 0) {
                params.categories = categories;
            }
            // Only add levels if not empty
            if (levels.length > 0) {
                params.levels = levels;
            }
            // Add search term if provided
            if (searchTerm) {
                params.search = searchTerm;
            }
            // Make the API request
            const response = await this.makeRequest(params);
            if (response.results && response.results.length > 0) {
                for (const job of response.results) {
                    const ingestJob = this.convertToIngestJob(job);
                    // Apply EU location filtering
                    if (this.isEULocation(ingestJob)) {
                        // Apply early-career filtering
                        if ((0, utils_js_1.classifyEarlyCareer)(ingestJob)) {
                            jobs.push(ingestJob);
                        }
                    }
                }
            }
            return jobs;
        }
        catch (error) {
            console.error(`❌ Error in searchWithParams for ${location}:`, error.message);
            return [];
        }
    }
    async scrapeAllLocations() {
        var _a;
        // ✅ OPTIMIZED: Get ALL jobs, filter with multilingual early career detection
        const categories = []; // Empty = no category filter
        const levels = []; // Empty = no level filter - get ALL jobs
        const allJobs = [];
        const metrics = {
            track: 'All',
            categories: 'All Categories',
            levels: 'All Levels (filtered locally)',
            locationsProcessed: 0,
            totalJobsFound: 0,
            earlyCareerJobs: 0,
            requestsUsed: 0,
            hourlyBudgetRemaining: MUSE_CONFIG.maxRequestsPerHour,
            errors: 0,
            startTime: new Date().toISOString()
        };
        console.log(`🔄 The Muse scraping - All Categories, All Levels (multilingual filtering)`);
        console.log(`📋 Categories: All (no filter)`);
        console.log(`🎯 Levels: All (filtered with multilingual early career detection)`);
        // ✅ OPTIMIZED: Process more locations with better batching
        const batchSize = 3; // Smaller batches for better rate limit management
        const locationBatches = [];
        for (let i = 0; i < MUSE_CONFIG.locations.length; i += batchSize) {
            locationBatches.push(MUSE_CONFIG.locations.slice(i, i + batchSize));
        }
        for (const batch of locationBatches) {
            // Check if we have enough hourly budget for this batch
            if (this.hourlyRequestCount >= MUSE_CONFIG.maxRequestsPerHour - (batch.length * 2)) {
                console.log('⏰ Approaching hourly rate limit, stopping early');
                break;
            }
            for (const location of batch) {
                try {
                    console.log(`\n📍 Processing ${location}...`);
                    const locationJobs = await this.fetchLocationJobs(location, categories, levels);
                    allJobs.push(...locationJobs);
                    metrics.locationsProcessed++;
                    metrics.earlyCareerJobs += locationJobs.length;
                    console.log(`✅ ${location}: ${locationJobs.length} early-career jobs found`);
                }
                catch (error) {
                    console.error(`❌ Error processing ${location}:`, error.message);
                    metrics.errors++;
                    // If we get repeated errors, wait longer before continuing
                    if (((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) >= 400) {
                        console.log('⏸️ API error encountered, waiting 30s before continuing...');
                        await new Promise(resolve => setTimeout(resolve, 30000));
                    }
                }
            }
            // Small delay between batches
            if (locationBatches.indexOf(batch) < locationBatches.length - 1) {
                console.log('⏸️ Brief pause between location batches...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
        metrics.totalJobsFound = allJobs.length;
        metrics.requestsUsed = this.requestCount;
        metrics.hourlyBudgetRemaining = MUSE_CONFIG.maxRequestsPerHour - this.hourlyRequestCount;
        console.log(`\n📊 The Muse scraping complete:`);
        console.log(`   📍 Locations processed: ${metrics.locationsProcessed}/${MUSE_CONFIG.locations.length}`);
        console.log(`   📋 Jobs found: ${metrics.totalJobsFound}`);
        console.log(`   📞 API calls used: ${metrics.requestsUsed}`);
        console.log(`   ⏰ Hourly budget remaining: ${metrics.hourlyBudgetRemaining}`);
        return { jobs: allJobs, metrics };
    }
    async scrapeSingleLocation(location) {
        // ✅ OPTIMIZED: Get ALL jobs, filter with multilingual early career detection
        const categories = []; // Empty = no category filter
        const levels = []; // Empty = no level filter - get ALL jobs
        console.log(`📍 The Muse scraping ${location} - All Categories, All Levels (multilingual filtering)`);
        const jobs = await this.fetchLocationJobs(location, categories, levels);
        const metrics = {
            location,
            track: 'All',
            categories: 'All Categories',
            levels: 'All Levels (filtered locally)',
            jobsFound: jobs.length,
            requestsUsed: this.requestCount,
            hourlyBudgetRemaining: MUSE_CONFIG.maxRequestsPerHour - this.hourlyRequestCount
        };
        return { jobs, metrics };
    }
    getStatus() {
        this.resetHourlyCount();
        return {
            isRunning: false,
            locationsSupported: MUSE_CONFIG.locations.length,
            categoriesSupported: MUSE_CONFIG.categories.length,
            requestsThisHour: this.hourlyRequestCount,
            hourlyBudget: MUSE_CONFIG.maxRequestsPerHour,
            hourlyBudgetRemaining: MUSE_CONFIG.maxRequestsPerHour - this.hourlyRequestCount,
            seenJobsCount: this.seenJobs.size,
            lastRequestTime: new Date(this.lastRequestTime).toISOString(),
            apiKeyConfigured: !!MUSE_CONFIG.apiKey
        };
    }
    getTargetLocations() {
        return MUSE_CONFIG.locations;
    }
    getDailyStats() {
        this.resetHourlyCount();
        return {
            requestsUsed: this.requestCount,
            hourlyBudgetRemaining: MUSE_CONFIG.maxRequestsPerHour - this.hourlyRequestCount,
            seenJobsCount: this.seenJobs.size
        };
    }
}
exports.default = MuseScraper;
