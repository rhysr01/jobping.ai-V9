"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const utils_js_1 = require("./utils.js");
// Configuration
const INDEED_CONFIG = {
    baseUrl: 'https://api.indeed.com/v2/jobs',
    apiKey: process.env.INDEED_API_KEY || '',
    // EU cities targeting (use your proven pattern)
    cities: [
        'London', 'Dublin', 'Berlin', 'Amsterdam', 'Paris',
        'Madrid', 'Barcelona', 'Stockholm', 'Copenhagen', 'Zurich'
    ],
    // Early-career focused queries (your proven approach)
    queries: [
        'graduate analyst', 'junior consultant', 'data analyst',
        'trainee manager', 'associate developer'
    ],
    // Rate limiting (your proven approach)
    requestInterval: 1000,
    dailyBudget: 100,
    seenJobTTL: 48 * 60 * 60 * 1000
};
const TRACK_QUERIES = {
    A: 'graduate analyst',
    B: 'junior consultant',
    C: 'data analyst',
    D: 'trainee manager',
    E: 'associate developer'
};
class IndeedScraper {
    constructor() {
        this.dailyCallCount = 0;
        this.lastRunDate = '';
        this.seenJobs = new Set();
        this.resetDailyCount();
    }
    resetDailyCount() {
        const today = new Date().toDateString();
        if (this.lastRunDate !== today) {
            this.dailyCallCount = 0;
            this.lastRunDate = today;
            this.seenJobs.clear();
        }
    }
    getTrackForDay() {
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
        const pattern = dayOfYear % 5;
        return ['A', 'B', 'C', 'D', 'E'][pattern];
    }
    async makeRequest(url, headers = {}) {
        if (this.dailyCallCount >= INDEED_CONFIG.dailyBudget) {
            throw new Error('Daily API budget exceeded');
        }
        try {
            const response = await axios_1.default.get(url, {
                headers: {
                    'Authorization': `Bearer ${INDEED_CONFIG.apiKey}`,
                    'User-Agent': 'JobPing/1.0 (https://jobping.com)',
                    'Accept': 'application/json',
                    ...headers
                },
                timeout: 10000
            });
            this.dailyCallCount++;
            return response.data;
        }
        catch (error) {
            if (error.response?.status === 429) {
                const retryAfter = error.response.headers['retry-after'];
                const delay = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
                console.warn(`Rate limited, waiting ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.makeRequest(url, headers);
            }
            throw error;
        }
    }
    buildUrl(city, track, page = 1) {
        const params = new URLSearchParams({
            query: TRACK_QUERIES[track],
            location: city,
            limit: '50',
            page: page.toString(),
            sort: 'date',
            // Add early-career specific filters
            experience_level: 'entry_level',
            age_max_days: '7'
        });
        return `${INDEED_CONFIG.baseUrl}?${params.toString()}`;
    }
    convertToIngestJob(sourceJob, city) {
        return {
            title: sourceJob.title,
            company: sourceJob.company,
            location: `${city}, ${sourceJob.location}`,
            description: sourceJob.description,
            url: sourceJob.url,
            posted_at: sourceJob.datePosted,
            source: 'indeed'
        };
    }
    generateJobKey(job, city) {
        return `${job.id}_${job.company}_${job.title}_${city}`.toLowerCase();
    }
    async fetchCityJobs(city, track) {
        const jobs = [];
        let page = 1;
        const maxPages = 3;
        while (page <= maxPages && this.dailyCallCount < INDEED_CONFIG.dailyBudget - 3) {
            try {
                const url = this.buildUrl(city, track, page);
                const response = await this.makeRequest(url);
                if (response.results.length === 0)
                    break;
                // Process jobs with your proven filtering approach
                for (const job of response.results) {
                    const jobKey = this.generateJobKey(job, city);
                    if (!this.seenJobs.has(jobKey)) {
                        this.seenJobs.add(jobKey);
                        try {
                            const ingestJob = this.convertToIngestJob(job, city);
                            // ✅ Apply your proven early-career filtering
                            const isEarlyCareer = (0, utils_js_1.classifyEarlyCareer)(ingestJob);
                            if (isEarlyCareer) {
                                jobs.push(ingestJob);
                                console.log(`✅ Early-career: ${ingestJob.title} at ${ingestJob.company}`);
                            }
                            else {
                                console.log(`🚫 Skipped senior: ${ingestJob.title} at ${ingestJob.company}`);
                            }
                        }
                        catch (error) {
                            console.warn(`Failed to process job ${job.id}:`, error);
                        }
                    }
                }
                page++;
                await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
            }
            catch (error) {
                console.error(`Error fetching ${city} page ${page}:`, error.message);
                break;
            }
        }
        return jobs;
    }
    async scrapeAllCities() {
        this.resetDailyCount();
        const track = this.getTrackForDay();
        const allJobs = [];
        const metrics = {
            citiesProcessed: 0,
            totalJobsFound: 0,
            earlyCareerJobs: 0,
            callsUsed: 0,
            budgetRemaining: INDEED_CONFIG.dailyBudget,
            errors: 0
        };
        console.log(`🔄 Indeed scraping with Track ${track}: ${TRACK_QUERIES[track]}`);
        for (const city of INDEED_CONFIG.cities) {
            try {
                console.log(`📍 Processing ${city}...`);
                const cityJobs = await this.fetchCityJobs(city, track);
                allJobs.push(...cityJobs);
                metrics.citiesProcessed++;
                metrics.earlyCareerJobs += cityJobs.length;
                console.log(`✅ ${city}: ${cityJobs.length} early-career jobs found`);
            }
            catch (error) {
                console.error(`❌ Error processing ${city}:`, error.message);
                metrics.errors++;
            }
        }
        metrics.totalJobsFound = allJobs.length;
        metrics.callsUsed = this.dailyCallCount;
        metrics.budgetRemaining = INDEED_CONFIG.dailyBudget - this.dailyCallCount;
        console.log(`📊 Indeed scraping complete: ${metrics.earlyCareerJobs} early-career jobs found, ${metrics.callsUsed} API calls used`);
        return { jobs: allJobs, metrics };
    }
    async scrapeSingleCity(city) {
        this.resetDailyCount();
        const track = this.getTrackForDay();
        console.log(`📍 Indeed scraping ${city} with Track ${track}`);
        const jobs = await this.fetchCityJobs(city, track);
        const metrics = {
            city,
            track,
            jobsFound: jobs.length,
            callsUsed: this.dailyCallCount,
            budgetRemaining: INDEED_CONFIG.dailyBudget - this.dailyCallCount
        };
        return { jobs, metrics };
    }
    getDailyStats() {
        return {
            callsUsed: this.dailyCallCount,
            budgetRemaining: INDEED_CONFIG.dailyBudget - this.dailyCallCount,
            lastRun: this.lastRunDate
        };
    }
    getTargetCities() {
        return INDEED_CONFIG.cities;
    }
    getStatus() {
        return {
            isRunning: false,
            citiesSupported: INDEED_CONFIG.cities.length,
            dailyBudget: INDEED_CONFIG.dailyBudget,
            callsUsed: this.dailyCallCount,
            seenJobsCount: this.seenJobs.size
        };
    }
}
exports.default = IndeedScraper;
