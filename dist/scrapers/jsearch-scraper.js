"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// ✅ FIXED JSearch Scraper - Optimized for EU Early Career Jobs
const utils_js_1 = require("./utils.js");
const smart_strategies_js_1 = require("./smart-strategies.js");
// ✅ OPTIMIZED JSearch Configuration
const JSEARCH_CONFIG = {
    baseUrl: 'https://jsearch.p.rapidapi.com/search',
    // ✅ Auth: Support either RAPIDAPI_KEY or JSEARCH_API_KEY; configurable host
    apiKey: process.env.RAPIDAPI_KEY || process.env.JSEARCH_API_KEY || '',
    apiHost: process.env.JSEARCH_HOST || 'jsearch.p.rapidapi.com',
    // Core EU cities - aligned with JobPing user preferences
    locations: [
        'London, United Kingdom',
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
    // ✅ FIXED: Much more reasonable rate limiting
    requestInterval: 300000, // 5 minutes default (reduced in test mode)
    monthlyBudget: 2000,
    dailyBudget: 65,
    seenJobTTL: 7 * 24 * 60 * 60 * 1000,
    resultsPerPage: 10,
    datePosted: 'week' // Will be overridden by smart strategy at runtime
};
const TRACK_QUERIES = {
    A: 'graduate scheme OR new grad OR campus hire OR recent graduate',
    B: 'graduate program OR junior analyst OR trainee consultant OR entry level',
    C: 'graduate marketing OR junior sales OR new grad business OR campus hire',
    D: 'graduate data analyst OR junior finance OR new grad operations OR trainee',
    E: 'graduate engineer OR junior developer OR new grad tech OR campus hire'
};
const TRACK_LOCATIONS = {
    A: ['London, United Kingdom', 'Berlin, Germany', 'Amsterdam, Netherlands', 'Stockholm, Sweden'],
    B: ['Dublin, Ireland', 'Paris, France', 'Zurich, Switzerland', 'London, United Kingdom'],
    C: ['Madrid, Spain', 'Barcelona, Spain', 'Milan, Italy', 'Copenhagen, Denmark'],
    D: ['London, United Kingdom', 'Amsterdam, Netherlands', 'Zurich, Switzerland', 'Munich, Germany'],
    E: ['Berlin, Germany', 'Dublin, Ireland', 'Paris, France', 'Munich, Germany']
};
class JSearchScraper {
    constructor() {
        this.requestCount = 0;
        this.dailyRequestCount = 0;
        this.monthlyRequestCount = 0;
        this.lastRequestTime = 0;
        this.lastDayReset = '';
        this.seenJobs = new Map();
        this.resetDailyCounts();
        this.cleanupSeenJobs();
        setInterval(() => this.cleanupSeenJobs(), 12 * 60 * 60 * 1000);
    }
    resetDailyCounts() {
        const today = new Date().toDateString();
        if (this.lastDayReset !== today) {
            this.dailyRequestCount = 0;
            this.lastDayReset = today;
        }
    }
    cleanupSeenJobs() {
        const cutoff = Date.now() - JSEARCH_CONFIG.seenJobTTL;
        for (const [jobId, timestamp] of this.seenJobs.entries()) {
            if (timestamp < cutoff) {
                this.seenJobs.delete(jobId);
            }
        }
    }
    getTrackForRun() {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const hour = now.getHours();
        const tracks = ['A', 'B', 'C', 'D', 'E'];
        const trackIndex = (dayOfWeek + Math.floor(hour / 5)) % 5;
        return tracks[trackIndex];
    }
    async throttleRequest() {
        this.resetDailyCounts();
        if (this.dailyRequestCount >= JSEARCH_CONFIG.dailyBudget) {
            throw new Error('Daily API budget exceeded');
        }
        if (this.monthlyRequestCount >= JSEARCH_CONFIG.monthlyBudget) {
            throw new Error('Monthly API budget exceeded');
        }
        // ✅ FIXED: Reasonable rate limiting; in test mode, reduce to 5 seconds
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        const interval = (process.env.JOBPING_TEST_MODE === '1') ? 5000 : JSEARCH_CONFIG.requestInterval;
        if (timeSinceLastRequest < interval) {
            const delay = interval - timeSinceLastRequest;
            console.log(`⏰ Rate limiting: waiting ${Math.round(delay / 1000 / 60)} minutes...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        this.lastRequestTime = Date.now();
    }
    async makeRequest(params) {
        await this.throttleRequest();
        try {
            // Use smart pagination strategy
            const pagination = (0, smart_strategies_js_1.withFallback)(() => (0, smart_strategies_js_1.getSmartPaginationStrategy)('jsearch'), { startPage: 1, endPage: 3 });
            const smartDatePosted = (0, smart_strategies_js_1.withFallback)(() => (0, smart_strategies_js_1.getSmartDateStrategy)('jsearch'), 'week');
            const queryParams = new URLSearchParams({
                query: params.query,
                page: (params.page || pagination.startPage).toString(),
                num_pages: (params.num_pages || (pagination.endPage - pagination.startPage + 1)).toString(),
                date_posted: params.datePosted || smartDatePosted,
                remote_jobs_only: (params.remote_jobs_only || false).toString(),
                employment_types: params.employment_types || 'FULLTIME,PARTTIME,CONTRACTOR',
                job_requirements: params.job_requirements || 'under_3_years_experience,no_degree'
            });
            const url = `${JSEARCH_CONFIG.baseUrl}?${queryParams.toString()}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-RapidAPI-Key': JSEARCH_CONFIG.apiKey,
                    'X-RapidAPI-Host': JSEARCH_CONFIG.apiHost,
                    'Accept': 'application/json',
                    'User-Agent': 'JobPing/1.0 (https://jobping.com)'
                }
            });
            if (!response.ok) {
                if (response.status === 429) {
                    console.warn('🚫 Rate limited, backing off...');
                    await new Promise(resolve => setTimeout(resolve, 60000));
                    return this.makeRequest(params);
                }
                throw new Error(`JSearch API error: ${response.status} ${response.statusText}`);
            }
            this.requestCount++;
            this.dailyRequestCount++;
            this.monthlyRequestCount++;
            const data = await response.json();
            return data;
        }
        catch (error) {
            console.error('JSearch API error:', error);
            throw error;
        }
    }
    convertToIngestJob(jSearchJob) {
        let location = 'Remote';
        if (jSearchJob.job_city && jSearchJob.job_country) {
            location = `${jSearchJob.job_city}, ${jSearchJob.job_country}`;
        }
        else if (jSearchJob.job_country) {
            location = jSearchJob.job_country;
        }
        else if (jSearchJob.job_city) {
            location = jSearchJob.job_city;
        }
        if (jSearchJob.job_is_remote) {
            location = `Remote, ${jSearchJob.job_country || 'EU'}`;
        }
        return {
            title: jSearchJob.job_title,
            company: jSearchJob.employer_name,
            location: location,
            description: jSearchJob.job_description,
            url: jSearchJob.job_apply_link,
            posted_at: jSearchJob.job_posted_at_datetime_utc,
            source: 'jsearch'
        };
    }
    async searchJobs(query, location) {
        var _a;
        const jobs = [];
        console.log(`🔍 Searching JSearch: "${query}" ${location ? `in ${location}` : ''}`);
        try {
            // ✅ IMPROVED: Better search query construction
            let searchQuery = query;
            if (location) {
                const city = location.split(',')[0].trim();
                searchQuery = `${query} ${city}`;
            }
            const params = {
                query: searchQuery,
                page: 1,
                num_pages: 1,
                date_posted: JSEARCH_CONFIG.datePosted,
                job_requirements: 'under_3_years_experience,no_degree'
            };
            const response = await this.makeRequest(params);
            console.log(`📊 Found ${((_a = response.data) === null || _a === void 0 ? void 0 : _a.length) || 0} jobs for "${query}"`);
            if (response.data && response.data.length > 0) {
                for (const job of response.data) {
                    if (!this.seenJobs.has(job.job_id)) {
                        this.seenJobs.set(job.job_id, Date.now());
                        try {
                            const ingestJob = this.convertToIngestJob(job);
                            const isEarlyCareer = (0, utils_js_1.classifyEarlyCareer)(ingestJob);
                            if (isEarlyCareer) {
                                if (this.isEULocation(job)) {
                                    jobs.push(ingestJob);
                                    console.log(`✅ Early-career EU: ${ingestJob.title} at ${ingestJob.company} (${ingestJob.location})`);
                                }
                                else {
                                    console.log(`🚫 Skipped non-EU: ${ingestJob.title} at ${ingestJob.company} (${ingestJob.location})`);
                                }
                            }
                            else {
                                console.log(`🚫 Skipped senior: ${ingestJob.title} at ${ingestJob.company}`);
                            }
                        }
                        catch (error) {
                            console.warn(`Failed to process job ${job.job_id}:`, error);
                        }
                    }
                }
            }
        }
        catch (error) {
            console.error(`❌ Error searching JSearch for "${query}":`, error.message);
        }
        return jobs;
    }
    // ✅ ENHANCED: Much more comprehensive EU location detection
    isEULocation(job) {
        const euPatterns = [
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
            // Major EU cities
            'london', 'manchester', 'birmingham', 'edinburgh', 'glasgow', 'leeds', 'liverpool',
            'dublin', 'cork', 'galway',
            'berlin', 'munich', 'hamburg', 'cologne', 'frankfurt', 'stuttgart', 'düsseldorf',
            'paris', 'marseille', 'lyon', 'toulouse', 'nice', 'nantes', 'strasbourg',
            'madrid', 'barcelona', 'valencia', 'seville', 'bilbao', 'málaga',
            'rome', 'milan', 'naples', 'turin', 'florence', 'bologna',
            'amsterdam', 'rotterdam', 'the hague', 'utrecht', 'eindhoven',
            'brussels', 'antwerp', 'ghent', 'bruges',
            'vienna', 'salzburg', 'graz', 'innsbruck',
            'zurich', 'geneva', 'basel', 'bern', 'lausanne',
            'stockholm', 'gothenburg', 'malmö', 'uppsala',
            'copenhagen', 'aarhus', 'odense', 'aalborg',
            'oslo', 'bergen', 'trondheim', 'stavanger',
            'helsinki', 'espoo', 'tampere', 'vantaa',
            'warsaw', 'krakow', 'gdansk', 'wrocław', 'poznań',
            'prague', 'brno', 'ostrava', 'plzen',
            'budapest', 'debrecen', 'szeged', 'miskolc',
            'lisbon', 'porto', 'braga', 'coimbra',
            'athens', 'thessaloniki', 'patras', 'heraklion'
        ];
        // Check job country
        if (job.job_country) {
            const country = job.job_country.toLowerCase().trim();
            if (euPatterns.some(pattern => country.includes(pattern) || pattern.includes(country))) {
                return true;
            }
        }
        // Check job city
        if (job.job_city) {
            const city = job.job_city.toLowerCase().trim();
            if (euPatterns.some(pattern => city.includes(pattern) || pattern.includes(city))) {
                return true;
            }
        }
        // Check combined location
        const fullLocation = `${job.job_city || ''} ${job.job_country || ''} ${job.job_description || ''}`.toLowerCase();
        if (euPatterns.some(pattern => fullLocation.includes(pattern))) {
            return true;
        }
        return false;
    }
    async scrapeWithTrackRotation() {
        const track = this.getTrackForRun();
        const query = TRACK_QUERIES[track];
        const locations = TRACK_LOCATIONS[track];
        const allJobs = [];
        const metrics = {
            track,
            query,
            locationsTargeted: locations,
            totalJobsFound: 0,
            earlyCareerJobs: 0,
            requestsUsed: 0,
            dailyBudgetRemaining: JSEARCH_CONFIG.dailyBudget - this.dailyRequestCount,
            monthlyBudgetRemaining: JSEARCH_CONFIG.monthlyBudget - this.monthlyRequestCount,
            errors: 0,
            startTime: new Date().toISOString()
        };
        console.log(`🔄 JSearch scraping with Track ${track}`);
        console.log(`🔍 Query: ${query}`);
        console.log(`📍 Locations: ${locations.join(', ')}`);
        try {
            // ✅ IMPROVED: Process more locations with faster rate limiting
            console.log(`\n📍 EU Location-specific searches...`);
            const maxLocations = Math.min(locations.length, 6);
            for (let i = 0; i < maxLocations; i++) {
                if (this.dailyRequestCount >= JSEARCH_CONFIG.dailyBudget - 2) {
                    console.log('⏰ Approaching daily budget limit, stopping');
                    break;
                }
                const location = locations[i];
                const locationJobs = await this.searchJobs(query, location);
                allJobs.push(...locationJobs);
            }
        }
        catch (error) {
            console.error(`❌ Error in JSearch scraping:`, error.message);
            metrics.errors++;
        }
        const uniqueJobs = this.deduplicateJobs(allJobs);
        metrics.totalJobsFound = uniqueJobs.length;
        metrics.earlyCareerJobs = uniqueJobs.length;
        metrics.requestsUsed = this.requestCount;
        metrics.dailyBudgetRemaining = JSEARCH_CONFIG.dailyBudget - this.dailyRequestCount;
        metrics.monthlyBudgetRemaining = JSEARCH_CONFIG.monthlyBudget - this.monthlyRequestCount;
        console.log(`\n📊 JSearch scraping complete:`);
        console.log(`   🔍 Query: ${query}`);
        console.log(`   📋 Jobs found: ${metrics.totalJobsFound}`);
        console.log(`   📞 API calls used: ${metrics.requestsUsed}`);
        console.log(`   📅 Daily budget remaining: ${metrics.dailyBudgetRemaining}`);
        console.log(`   📆 Monthly budget remaining: ${metrics.monthlyBudgetRemaining}`);
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
        this.resetDailyCounts();
        return {
            isRunning: false,
            locationsSupported: JSEARCH_CONFIG.locations.length,
            requestsToday: this.dailyRequestCount,
            requestsThisMonth: this.monthlyRequestCount,
            dailyBudget: JSEARCH_CONFIG.dailyBudget,
            monthlyBudget: JSEARCH_CONFIG.monthlyBudget,
            dailyBudgetRemaining: JSEARCH_CONFIG.dailyBudget - this.dailyRequestCount,
            monthlyBudgetRemaining: JSEARCH_CONFIG.monthlyBudget - this.monthlyRequestCount,
            seenJobsCount: this.seenJobs.size,
            lastRequestTime: new Date(this.lastRequestTime).toISOString(),
            nextRequestAvailable: new Date(this.lastRequestTime + JSEARCH_CONFIG.requestInterval).toISOString()
        };
    }
    getDailyStats() {
        this.resetDailyCounts();
        return {
            requestsUsed: this.dailyRequestCount,
            dailyBudgetRemaining: JSEARCH_CONFIG.dailyBudget - this.dailyRequestCount,
            monthlyBudgetRemaining: JSEARCH_CONFIG.monthlyBudget - this.monthlyRequestCount,
            seenJobsCount: this.seenJobs.size
        };
    }
}
exports.default = JSearchScraper;
