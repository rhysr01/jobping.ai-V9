"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// ✅ Ashby Scraper - EU-Focused Companies
const axios_1 = __importDefault(require("axios"));
const utils_js_1 = require("./utils.js");
// ✅ Ashby Configuration
const ASHBY_CONFIG = {
    baseUrl: 'https://api.ashbyhq.com/posting-api/job-board',
    // EU-focused companies using Ashby
    companies: [
        { name: 'Stripe', boardId: 'stripe', priority: 'high', euOffices: ['Dublin', 'London', 'Amsterdam', 'Berlin'] },
        { name: 'Notion', boardId: 'notion', priority: 'high', euOffices: ['Dublin', 'London'] },
        { name: 'Linear', boardId: 'linear', priority: 'medium', euOffices: ['Remote'] },
        { name: 'Loom', boardId: 'loom', priority: 'medium', euOffices: ['London', 'Dublin'] },
        { name: 'Revolut', boardId: 'revolut', priority: 'high', euOffices: ['London', 'Berlin', 'Amsterdam', 'Dublin'] },
        { name: 'Monzo', boardId: 'monzo', priority: 'high', euOffices: ['London', 'Dublin'] },
        { name: 'N26', boardId: 'n26', priority: 'high', euOffices: ['Berlin', 'Barcelona', 'Vienna'] },
        { name: 'Klarna', boardId: 'klarna', priority: 'high', euOffices: ['Stockholm', 'Berlin', 'Amsterdam'] },
        { name: 'Spotify', boardId: 'spotify', priority: 'high', euOffices: ['Stockholm', 'London', 'Amsterdam', 'Berlin'] },
        { name: 'Figma', boardId: 'figma', priority: 'medium', euOffices: ['London', 'Amsterdam'] },
        { name: 'Canva', boardId: 'canva', priority: 'medium', euOffices: ['Dublin'] },
        { name: 'GitLab', boardId: 'gitlab', priority: 'high', euOffices: ['Remote'] },
        { name: 'Buffer', boardId: 'buffer', priority: 'medium', euOffices: ['Remote'] },
        { name: 'Zapier', boardId: 'zapier', priority: 'medium', euOffices: ['Remote'] },
        { name: 'Doist', boardId: 'doist', priority: 'low', euOffices: ['Remote'] }
    ],
    // Rate limiting
    requestInterval: 1000, // 1 second between requests (be respectful)
    seenJobTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxRetries: 3
};
class AshbyScraper {
    constructor() {
        this.requestCount = 0;
        this.lastRequestTime = 0;
        this.seenJobs = new Map();
        this.cleanupSeenJobs();
        setInterval(() => this.cleanupSeenJobs(), 12 * 60 * 60 * 1000);
    }
    cleanupSeenJobs() {
        const cutoff = Date.now() - ASHBY_CONFIG.seenJobTTL;
        for (const [jobId, timestamp] of this.seenJobs.entries()) {
            if (timestamp < cutoff) {
                this.seenJobs.delete(jobId);
            }
        }
    }
    async throttleRequest() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < ASHBY_CONFIG.requestInterval) {
            const delay = ASHBY_CONFIG.requestInterval - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        this.lastRequestTime = Date.now();
    }
    async makeRequest(url, retries = 0) {
        var _a, _b, _c;
        await this.throttleRequest();
        try {
            console.log(`🔗 Ashby API request: ${url}`);
            const response = await axios_1.default.get(url, {
                headers: {
                    'User-Agent': 'JobPing/1.0 (https://jobping.com)',
                    'Accept': 'application/json'
                },
                timeout: 15000
            });
            this.requestCount++;
            console.log(`📊 Ashby API response: ${((_a = response.data) === null || _a === void 0 ? void 0 : _a.length) || 0} jobs found`);
            return response.data || [];
        }
        catch (error) {
            if (((_b = error.response) === null || _b === void 0 ? void 0 : _b.status) === 429) {
                console.warn('🚫 Ashby rate limited, backing off...');
                await new Promise(resolve => setTimeout(resolve, 5000));
                if (retries < ASHBY_CONFIG.maxRetries) {
                    return this.makeRequest(url, retries + 1);
                }
            }
            if (((_c = error.response) === null || _c === void 0 ? void 0 : _c.status) === 404) {
                console.warn(`⚠️ Company board not found: ${url}`);
                return [];
            }
            console.error('❌ Ashby API error:', error.message);
            if (error.response) {
                console.error('❌ Response status:', error.response.status);
                console.error('❌ Response data:', error.response.data);
            }
            if (retries < ASHBY_CONFIG.maxRetries) {
                console.log(`🔄 Retrying request (${retries + 1}/${ASHBY_CONFIG.maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return this.makeRequest(url, retries + 1);
            }
            throw error;
        }
    }
    convertToIngestJob(ashbyJob, companyName) {
        // Clean HTML from description
        const cleanDescription = ashbyJob.descriptionHtml
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
            .replace(/&amp;/g, '&') // Replace &amp; with &
            .replace(/&lt;/g, '<') // Replace &lt; with <
            .replace(/&gt;/g, '>') // Replace &gt; with >
            .replace(/&quot;/g, '"') // Replace &quot; with "
            .replace(/&#39;/g, "'") // Replace &#39; with '
            .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
            .trim();
        return {
            title: ashbyJob.title,
            company: companyName,
            location: ashbyJob.location.locationName,
            description: cleanDescription,
            url: ashbyJob.applicationUrl,
            posted_at: ashbyJob.publishedDate,
            source: 'ashby'
        };
    }
    isEUJob(ashbyJob, company) {
        const location = ashbyJob.location.locationName.toLowerCase();
        // Check if it's remote and company has EU presence
        if (ashbyJob.isRemote && company.euOffices) {
            return true;
        }
        // Check EU office locations
        if (company.euOffices) {
            return company.euOffices.some(office => location.includes(office.toLowerCase()));
        }
        // Check for EU cities/countries in location
        const euPatterns = [
            'dublin', 'london', 'berlin', 'amsterdam', 'paris', 'madrid', 'munich',
            'stockholm', 'zurich', 'copenhagen', 'vienna', 'brussels', 'prague',
            'warsaw', 'barcelona', 'milan', 'rome', 'lisbon', 'athens',
            'ireland', 'united kingdom', 'germany', 'netherlands', 'france',
            'spain', 'sweden', 'switzerland', 'denmark', 'austria', 'belgium',
            'czech republic', 'poland', 'italy', 'portugal', 'greece'
        ];
        return euPatterns.some(pattern => location.includes(pattern));
    }
    async fetchCompanyJobs(company) {
        const jobs = [];
        console.log(`🏢 Fetching jobs from ${company.name} (${company.boardId})`);
        try {
            const url = `${ASHBY_CONFIG.baseUrl}/${company.boardId}`;
            const ashbyJobs = await this.makeRequest(url);
            if (!ashbyJobs || ashbyJobs.length === 0) {
                console.log(`📭 No jobs found for ${company.name}`);
                return jobs;
            }
            console.log(`📊 Found ${ashbyJobs.length} jobs from ${company.name}`);
            for (const ashbyJob of ashbyJobs) {
                if (!this.seenJobs.has(ashbyJob.id)) {
                    this.seenJobs.set(ashbyJob.id, Date.now());
                    try {
                        // Check if it's an EU job
                        if (!this.isEUJob(ashbyJob, company)) {
                            console.log(`🚫 Skipped non-EU: ${ashbyJob.title} at ${company.name} (${ashbyJob.location.locationName})`);
                            continue;
                        }
                        const ingestJob = this.convertToIngestJob(ashbyJob, company.name);
                        const isEarlyCareer = (0, utils_js_1.classifyEarlyCareer)(ingestJob);
                        if (isEarlyCareer) {
                            jobs.push(ingestJob);
                            console.log(`✅ Early-career EU: ${ingestJob.title} at ${ingestJob.company} (${ingestJob.location})`);
                        }
                        else {
                            console.log(`🚫 Skipped senior: ${ingestJob.title} at ${ingestJob.company}`);
                        }
                    }
                    catch (error) {
                        console.warn(`Failed to process job ${ashbyJob.id}:`, error);
                    }
                }
            }
        }
        catch (error) {
            console.error(`❌ Error fetching jobs from ${company.name}:`, error.message);
        }
        return jobs;
    }
    async scrapeAllCompanies() {
        var _a;
        const allJobs = [];
        const metrics = {
            companiesProcessed: 0,
            totalJobsFound: 0,
            earlyCareerJobs: 0,
            requestsUsed: 0,
            errors: 0,
            startTime: new Date().toISOString()
        };
        console.log(`🔄 Ashby scraping - EU-Focused Companies`);
        console.log(`🏢 Target companies: ${ASHBY_CONFIG.companies.length}`);
        try {
            // Process companies by priority
            const sortedCompanies = ASHBY_CONFIG.companies.sort((a, b) => {
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            });
            for (const company of sortedCompanies) {
                try {
                    console.log(`\n🏢 Processing ${company.name} (${company.priority} priority)...`);
                    const companyJobs = await this.fetchCompanyJobs(company);
                    allJobs.push(...companyJobs);
                    metrics.companiesProcessed++;
                    metrics.earlyCareerJobs += companyJobs.length;
                    console.log(`✅ ${company.name}: ${companyJobs.length} early-career EU jobs found`);
                }
                catch (error) {
                    console.error(`❌ Error processing ${company.name}:`, error.message);
                    metrics.errors++;
                    // If we get repeated errors, wait longer before continuing
                    if (((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) >= 400) {
                        console.log('⏸️ API error encountered, waiting 10s before continuing...');
                        await new Promise(resolve => setTimeout(resolve, 10000));
                    }
                }
            }
        }
        catch (error) {
            console.error(`❌ Error in Ashby scraping:`, error.message);
            metrics.errors++;
        }
        const uniqueJobs = this.deduplicateJobs(allJobs);
        metrics.totalJobsFound = uniqueJobs.length;
        metrics.earlyCareerJobs = uniqueJobs.length;
        metrics.requestsUsed = this.requestCount;
        console.log(`\n📊 Ashby scraping complete:`);
        console.log(`   🏢 Companies processed: ${metrics.companiesProcessed}/${ASHBY_CONFIG.companies.length}`);
        console.log(`   📋 Jobs found: ${metrics.totalJobsFound}`);
        console.log(`   📞 API calls used: ${metrics.requestsUsed}`);
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
        return {
            isRunning: false,
            companiesSupported: ASHBY_CONFIG.companies.length,
            requestsUsed: this.requestCount,
            seenJobsCount: this.seenJobs.size,
            lastRequestTime: new Date(this.lastRequestTime).toISOString()
        };
    }
    getDailyStats() {
        return {
            requestsUsed: this.requestCount,
            seenJobsCount: this.seenJobs.size
        };
    }
}
exports.default = AshbyScraper;
