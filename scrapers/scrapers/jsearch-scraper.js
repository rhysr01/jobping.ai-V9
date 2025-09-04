"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const httpClient_js_1 = require("../Utils/httpClient.js");
const utils_js_1 = require("./utils.js");
// JSearch API Configuration
const JSEARCH_CONFIG = {
    baseUrl: 'https://jsearch.p.rapidapi.com/search',
    apiKey: process.env.RAPIDAPI_KEY || '',
    // EU cities and countries for targeting
    locations: [
        'London, United Kingdom',
        'Dublin, Ireland',
        'Berlin, Germany',
        'Munich, Germany',
        'Amsterdam, Netherlands',
        'Rotterdam, Netherlands',
        'Paris, France',
        'Madrid, Spain',
        'Barcelona, Spain',
        'Stockholm, Sweden',
        'Copenhagen, Denmark',
        'Zurich, Switzerland',
        'Vienna, Austria',
        'Milan, Italy',
        'Rome, Italy',
        'Brussels, Belgium',
        'Prague, Czech Republic',
        'Warsaw, Poland'
    ],
    // Early-career focused search queries
    queries: [
        'graduate program',
        'junior developer',
        'entry level analyst',
        'trainee consultant',
        'associate marketing',
        'graduate scheme',
        'junior data analyst',
        'entry level finance',
        'trainee operations',
        'graduate engineer'
    ],
    // Rate limiting (Free tier: 2,500 requests/month ≈ 83/day ≈ 3.5/hour)
    requestInterval: 1200000, // 20 minutes between requests to be very conservative
    monthlyBudget: 2000, // Leave buffer under 2,500 limit  
    dailyBudget: 65, // ~83/day but be conservative
    seenJobTTL: 7 * 24 * 60 * 60 * 1000, // 7 days (JSearch has good freshness)
    // Results per page (max 10 for free tier)
    resultsPerPage: 10,
    // Date filter (only recent jobs)
    datePosted: 'week' // today, 3days, week, month
};
const TRACK_QUERIES = {
    A: 'graduate program OR junior developer', // Tech focus
    B: 'entry level analyst OR trainee consultant', // Business focus
    C: 'associate marketing OR graduate sales', // Marketing/Sales focus  
    D: 'junior data analyst OR entry level finance', // Analytics/Finance focus
    E: 'trainee operations OR graduate engineer' // Operations/Engineering focus
};
const TRACK_LOCATIONS = {
    A: ['London, United Kingdom', 'Berlin, Germany', 'Amsterdam, Netherlands'], // Tech hubs
    B: ['Dublin, Ireland', 'Paris, France', 'Zurich, Switzerland'], // Business centers
    C: ['Madrid, Spain', 'Stockholm, Sweden', 'Milan, Italy'], // Creative hubs
    D: ['Copenhagen, Denmark', 'Vienna, Austria', 'Brussels, Belgium'], // Finance/Analytics
    E: ['Munich, Germany', 'Barcelona, Spain', 'Prague, Czech Republic'] // Engineering/Ops
};
class JSearchScraper {
    constructor() {
        this.requestCount = 0;
        this.dailyRequestCount = 0;
        this.monthlyRequestCount = 0;
        this.lastRequestTime = 0;
        this.lastDayReset = '';
        this.seenJobs = new Map(); // jobId -> timestamp
        this.resetDailyCounts();
        this.cleanupSeenJobs();
        // Clean up seen jobs every 12 hours
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
        // Rotate based on day of week and hour to get good diversity
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0-6
        const hour = now.getHours(); // 0-23
        const tracks = ['A', 'B', 'C', 'D', 'E'];
        const trackIndex = (dayOfWeek + Math.floor(hour / 5)) % 5; // Rotate every ~5 hours
        return tracks[trackIndex];
    }
    async throttleRequest() {
        this.resetDailyCounts();
        // Check daily budget
        if (this.dailyRequestCount >= JSEARCH_CONFIG.dailyBudget) {
            throw new Error('Daily API budget exceeded - JSearch free tier limit reached');
        }
        // Check monthly budget  
        if (this.monthlyRequestCount >= JSEARCH_CONFIG.monthlyBudget) {
            throw new Error('Monthly API budget exceeded - JSearch free tier limit reached');
        }
        // Enforce minimum time between requests (20 minutes)
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < JSEARCH_CONFIG.requestInterval) {
            const delay = JSEARCH_CONFIG.requestInterval - timeSinceLastRequest;
            console.log(`⏰ Rate limiting: waiting ${Math.round(delay / 1000 / 60)} minutes before next request...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        this.lastRequestTime = Date.now();
    }
    async makeRequest(params) {
        await this.throttleRequest();
        try {
            const response = await httpClient_js_1.httpClient.get(JSEARCH_CONFIG.baseUrl, {
                params: {
                    query: params.query,
                    page: params.page || 1,
                    num_pages: params.num_pages || 1,
                    date_posted: params.date_posted || JSEARCH_CONFIG.datePosted,
                    remote_jobs_only: params.remote_jobs_only || false,
                    employment_types: params.employment_types || 'FULLTIME,PARTTIME,CONTRACTOR',
                    job_requirements: params.job_requirements || 'under_3_years_experience,no_degree',
                    ...params
                },
                headers: {
                    'X-RapidAPI-Key': JSEARCH_CONFIG.apiKey,
                    'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
                    'Accept': 'application/json'
                }
            }, {
                dailyLimit: JSEARCH_CONFIG.dailyBudget,
                minInterval: JSEARCH_CONFIG.requestInterval
            });
            this.requestCount++;
            this.dailyRequestCount++;
            this.monthlyRequestCount++;
            return response.data;
        }
        catch (error) {
            if (error.response?.status === 429) {
                console.warn('🚫 Rate limited by JSearch API, backing off...');
                await new Promise(resolve => setTimeout(resolve, 30000)); // 30 second backoff
                return this.makeRequest(params);
            }
            if (error.response?.status === 403) {
                throw new Error('JSearch API access denied - check your RapidAPI key and subscription');
            }
            if (error.response?.status === 402) {
                throw new Error('JSearch API quota exceeded - upgrade your RapidAPI plan');
            }
            console.error('JSearch API error:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data
            });
            throw error;
        }
    }
    convertToIngestJob(jSearchJob) {
        // Build comprehensive location
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
        // Handle remote jobs
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
        const jobs = [];
        console.log(`🔍 Searching JSearch: "${query}" ${location ? `in ${location}` : ''}`);
        try {
            // Build search query - combine job query with location if provided
            const searchQuery = location ? `${query} location:${location}` : query;
            const params = {
                query: searchQuery,
                page: 1,
                num_pages: 1, // Only fetch 1 page to conserve API quota
                date_posted: JSEARCH_CONFIG.datePosted,
                job_requirements: 'under_3_years_experience,no_degree' // Focus on early career
            };
            const response = await this.makeRequest(params);
            console.log(`📊 Found ${response.data?.length || 0} jobs for "${query}"`);
            if (response.data && response.data.length > 0) {
                for (const job of response.data) {
                    if (!this.seenJobs.has(job.job_id)) {
                        this.seenJobs.set(job.job_id, Date.now());
                        try {
                            const ingestJob = this.convertToIngestJob(job);
                            // ✅ Apply early-career filtering
                            const isEarlyCareer = (0, utils_js_1.classifyEarlyCareer)(ingestJob);
                            if (isEarlyCareer) {
                                // ✅ ADD EU LOCATION FILTERING - Only accept EU jobs
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
    // ✅ NEW METHOD: EU Location Filtering
    isEULocation(job) {
        // EU countries list
        const euCountries = [
            'United Kingdom', 'UK', 'GB',
            'Ireland', 'IE',
            'Germany', 'DE',
            'Netherlands', 'NL',
            'France', 'FR',
            'Spain', 'ES',
            'Sweden', 'SE',
            'Denmark', 'DK',
            'Switzerland', 'CH',
            'Austria', 'AT',
            'Italy', 'IT',
            'Belgium', 'BE',
            'Czech Republic', 'CZ',
            'Poland', 'PL',
            'Finland', 'FI',
            'Norway', 'NO',
            'Portugal', 'PT',
            'Greece', 'GR',
            'Hungary', 'HU',
            'Romania', 'RO',
            'Bulgaria', 'BG',
            'Croatia', 'HR',
            'Slovenia', 'SI',
            'Slovakia', 'SK',
            'Estonia', 'EE',
            'Latvia', 'LV',
            'Lithuania', 'LT',
            'Luxembourg', 'LU',
            'Malta', 'MT',
            'Cyprus', 'CY'
        ];
        // Check if job country is in EU
        if (job.job_country) {
            const country = job.job_country.trim();
            if (euCountries.some(euCountry => euCountry.toLowerCase() === country.toLowerCase())) {
                return true;
            }
        }
        // Check if job city contains EU city names
        if (job.job_city) {
            const city = job.job_city.toLowerCase();
            const euCities = [
                'london', 'madrid', 'berlin', 'barcelona', 'amsterdam', 'dublin',
                'munich', 'stockholm', 'copenhagen', 'zurich', 'vienna', 'paris',
                'milan', 'rome', 'brussels', 'prague', 'warsaw', 'rotterdam',
                'hamburg', 'frankfurt', 'cologne', 'dusseldorf', 'leipzig', 'dresden',
                'manchester', 'birmingham', 'edinburgh', 'glasgow', 'leeds', 'liverpool',
                'lyon', 'marseille', 'toulouse', 'nice', 'nantes', 'strasbourg',
                'valencia', 'seville', 'bilbao', 'malaga', 'granada', 'cordoba'
            ];
            if (euCities.some(euCity => city.includes(euCity))) {
                return true;
            }
        }
        // If no clear EU location, reject the job
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
            // ✅ EU-ONLY SEARCHES - No more global search to avoid US jobs
            console.log(`\n📍 EU Location-specific searches...`);
            for (let i = 0; i < Math.min(locations.length, 3); i++) { // Max 3 location searches
                if (this.dailyRequestCount >= JSEARCH_CONFIG.dailyBudget - 1) {
                    console.log('⏰ Approaching daily budget limit, stopping location searches');
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
        // Remove any duplicates that might have come from multiple searches
        const uniqueJobs = this.deduplicateJobs(allJobs);
        metrics.totalJobsFound = uniqueJobs.length;
        metrics.earlyCareerJobs = uniqueJobs.length; // All jobs already filtered
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
    async searchSingleQuery(query, location) {
        console.log(`🔍 JSearch single query: "${query}" ${location ? `in ${location}` : ''}`);
        const jobs = await this.searchJobs(query, location);
        const metrics = {
            query,
            location: location || 'global',
            jobsFound: jobs.length,
            requestsUsed: 1,
            dailyBudgetRemaining: JSEARCH_CONFIG.dailyBudget - this.dailyRequestCount,
            monthlyBudgetRemaining: JSEARCH_CONFIG.monthlyBudget - this.monthlyRequestCount
        };
        return { jobs, metrics };
    }
    getStatus() {
        this.resetDailyCounts();
        return {
            isRunning: false,
            locationsSupported: JSEARCH_CONFIG.locations.length,
            queriesSupported: Object.keys(TRACK_QUERIES).length,
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
    getAvailableQueries() {
        return TRACK_QUERIES;
    }
    getAvailableLocations() {
        return JSEARCH_CONFIG.locations;
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
