"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RapidAPIInternshipsScraper = void 0;
// ✅ RapidAPI Internships Scraper - Properly Integrated with JobPing Pipeline
const axios_1 = __importDefault(require("axios"));
const utils_js_1 = require("./utils.js");
const supabase_js_1 = require("@supabase/supabase-js");
// Simple location normalization function
function normalizeLocation(location) {
    return [location.toLowerCase().trim()];
}
// Simple job categories creation
function createJobCategories(careerPath, additionalTags = []) {
    const tags = [`career:${careerPath}`, ...additionalTags];
    return tags.join('|');
}
// Configuration
const RAPIDAPI_CONFIG = {
    baseUrl: 'https://internships-api.p.rapidapi.com',
    headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
        'X-RapidAPI-Host': 'internships-api.p.rapidapi.com'
    },
    rateLimit: {
        requestsPerMinute: 60, // 200 calls/day = ~8 calls/hour, so 60/min is safe
        requestInterval: 1000 // 1 second between requests
    },
    // Use the correct endpoint that returns active internships
    endpoint: '/active-jb-7d', // Active internships from last 7 days
    maxDaysOld: 7 // Smart date filtering
};
// Funnel Telemetry Tracker
class FunnelTelemetryTracker {
    constructor() {
        this.metrics = {
            raw: 0,
            eligible: 0,
            careerTagged: 0,
            locationTagged: 0,
            inserted: 0,
            updated: 0,
            errors: [],
            samples: []
        };
    }
    trackRaw(count) {
        this.metrics.raw += count;
    }
    trackEligible(count) {
        this.metrics.eligible += count;
    }
    trackCareerTagged(count) {
        this.metrics.careerTagged += count;
    }
    trackLocationTagged(count) {
        this.metrics.locationTagged += count;
    }
    trackInserted(count) {
        this.metrics.inserted += count;
    }
    trackUpdated(count) {
        this.metrics.updated += count;
    }
    trackError(error) {
        this.metrics.errors.push(error);
    }
    trackSample(sample) {
        this.metrics.samples.push(sample);
    }
    getMetrics() {
        return Object.assign({}, this.metrics);
    }
}
// Rate limiting
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
// Main scraper class
class RapidAPIInternshipsScraper {
    constructor() {
        this.telemetry = new FunnelTelemetryTracker();
        // Initialize Supabase client
        this.supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    }
    async fetchInternships(page = 1) {
        var _a;
        try {
            const response = await axios_1.default.get(`${RAPIDAPI_CONFIG.baseUrl}${RAPIDAPI_CONFIG.endpoint}`, {
                headers: RAPIDAPI_CONFIG.headers,
                params: { page },
                timeout: 10000
            });
            return response.data;
        }
        catch (error) {
            if (((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) === 429) {
                console.log('⏳ Rate limited, waiting 2 seconds...');
                await sleep(2000);
                return this.fetchInternships(page);
            }
            throw new Error(`RapidAPI fetch failed: ${error.message}`);
        }
    }
    async fetchAllInternships(maxPages = 10) {
        const allInternships = [];
        for (let page = 1; page <= maxPages; page++) {
            console.log(`📄 Fetching page ${page}...`);
            try {
                const internships = await this.fetchInternships(page);
                if (internships.length === 0) {
                    console.log(`📄 Page ${page} returned 0 jobs, stopping pagination`);
                    break;
                }
                allInternships.push(...internships);
                console.log(`✅ Page ${page}: ${internships.length} jobs (Total: ${allInternships.length})`);
                // Rate limiting between pages
                if (page < maxPages) {
                    await sleep(RAPIDAPI_CONFIG.rateLimit.requestInterval);
                }
            }
            catch (error) {
                console.error(`❌ Error fetching page ${page}:`, error.message);
                break;
            }
        }
        return allInternships;
    }
    normalizeInternship(internship) {
        var _a, _b;
        // Create description from available data
        const description = [
            internship.linkedin_org_description || '',
            `Industry: ${internship.linkedin_org_industry || 'Unknown'}`,
            `Seniority: ${internship.seniority || 'Unknown'}`,
            `Employment Type: ${((_a = internship.employment_type) === null || _a === void 0 ? void 0 : _a.join(', ')) || 'Unknown'}`
        ].filter(Boolean).join('\n\n');
        // Combine all possible location hints to improve EU detection downstream
        const combinedLocationParts = [];
        const anyInternship = internship;
        if (Array.isArray(anyInternship.locations_derived))
            combinedLocationParts.push(...anyInternship.locations_derived);
        if (Array.isArray(anyInternship.cities_derived))
            combinedLocationParts.push(...anyInternship.cities_derived);
        if (Array.isArray(anyInternship.countries_derived))
            combinedLocationParts.push(...anyInternship.countries_derived);
        if (anyInternship.location)
            combinedLocationParts.push(anyInternship.location);
        if (anyInternship.linkedin_org_location)
            combinedLocationParts.push(anyInternship.linkedin_org_location);
        if (anyInternship.city)
            combinedLocationParts.push(anyInternship.city);
        if (anyInternship.country)
            combinedLocationParts.push(anyInternship.country);
        const combinedLocation = (combinedLocationParts.filter(Boolean).join(', ') || ((_b = internship.locations_derived) === null || _b === void 0 ? void 0 : _b[0]) || 'Unknown Location');
        return {
            title: internship.title || 'Unknown Title',
            company: internship.organization || 'Unknown Company',
            location: combinedLocation,
            description: description,
            url: internship.url || '',
            posted_at: internship.date_posted || new Date().toISOString(),
            source: 'rapidapi-internships'
        };
    }
    async scrapeAllQueries() {
        console.log('🚀 Starting RapidAPI Internships scraping...');
        try {
            // Fetch all active internships from multiple pages
            console.log('🔍 Fetching active internships from multiple pages...');
            const internships = await this.fetchAllInternships(10); // Fetch up to 10 pages
            this.telemetry.trackRaw(internships.length);
            console.log(`📊 Total raw internships found: ${internships.length}`);
            // Normalize all internships
            const allJobs = internships.map(internship => this.normalizeInternship(internship));
            // Skip early career filtering - ALL internships are inherently early career
            const earlyCareerJobs = allJobs; // All internships are early career
            this.telemetry.trackEligible(earlyCareerJobs.length);
            console.log(`🎯 Early career jobs: ${earlyCareerJobs.length} (100% - all internships are early career)`);
            // Apply EU location filtering with focus on EU capital cities
            const euJobs = earlyCareerJobs.filter(job => {
                const location = job.location.toLowerCase();
                // EU Capital Cities (Priority Focus)
                const euCapitalCities = [
                    'berlin', 'paris', 'madrid', 'amsterdam', 'london', 'dublin', 'copenhagen',
                    'stockholm', 'oslo', 'helsinki', 'rome', 'vienna', 'brussels', 'zurich',
                    'warsaw', 'prague', 'lisbon', 'athens', 'luxembourg', 'ljubljana', 'bratislava',
                    'budapest', 'bucharest', 'sofia', 'zagreb', 'tallinn', 'riga', 'vilnius',
                    'valletta', 'nicosia'
                ];
                // EU Countries
                const euCountries = [
                    'germany', 'france', 'spain', 'netherlands', 'uk', 'united kingdom', 'ireland',
                    'denmark', 'sweden', 'norway', 'finland', 'italy', 'austria', 'belgium',
                    'switzerland', 'poland', 'czech', 'portugal', 'greece', 'luxembourg',
                    'slovenia', 'slovakia', 'hungary', 'romania', 'bulgaria', 'croatia',
                    'estonia', 'latvia', 'lithuania', 'malta', 'cyprus'
                ];
                // Major EU Business Cities
                const majorEuCities = [
                    'munich', 'hamburg', 'frankfurt', 'cologne', 'stuttgart', 'düsseldorf',
                    'lyon', 'marseille', 'toulouse', 'nice', 'nantes', 'strasbourg',
                    'barcelona', 'valencia', 'seville', 'bilbao', 'zaragoza',
                    'rotterdam', 'the hague', 'utrecht', 'eindhoven', 'tilburg',
                    'birmingham', 'manchester', 'glasgow', 'liverpool', 'leeds', 'edinburgh',
                    'cork', 'limerick', 'galway', 'waterford',
                    'aarhus', 'odense', 'aalborg', 'esbjerg',
                    'gothenburg', 'malmö', 'uppsala', 'västerås',
                    'bergen', 'trondheim', 'stavanger', 'drammen',
                    'espoo', 'tampere', 'vantaa', 'turku',
                    'milan', 'naples', 'turin', 'palermo', 'genoa', 'bologna',
                    'graz', 'linz', 'salzburg', 'innsbruck',
                    'antwerp', 'ghent', 'charleroi', 'liège',
                    'geneva', 'basel', 'bern', 'lausanne',
                    'krakow', 'gdansk', 'wroclaw', 'poznan',
                    'brno', 'ostrava', 'plzen', 'liberec',
                    'porto', 'amadora', 'braga', 'coimbra',
                    'thessaloniki', 'patras', 'piraeus', 'larissa'
                ];
                // EU regions and remote options
                const euRegions = [
                    'europe', 'eu', 'european union', 'european', 'europa',
                    'eu remote', 'europe remote', 'remote eu', 'remote, europe', 'remote - europe'
                ];
                // Check for capital cities first (highest priority)
                const isCapitalCity = euCapitalCities.some(city => location.includes(city));
                const isEuCountry = euCountries.some(country => location.includes(country));
                const isMajorCity = majorEuCities.some(city => location.includes(city));
                const isEuRegion = euRegions.some(region => location.includes(region));
                return isCapitalCity || isEuCountry || isMajorCity || isEuRegion;
            });
            this.telemetry.trackLocationTagged(euJobs.length);
            console.log(`🇪🇺 EU location jobs: ${euJobs.length} (${((euJobs.length / earlyCareerJobs.length) * 100).toFixed(1)}%)`);
            // Apply career path tagging
            const careerTaggedJobs = euJobs.map(job => {
                // Simple career path extraction based on title keywords
                const text = `${job.title} ${job.description}`.toLowerCase();
                let careerPath = 'unknown';
                if (text.includes('software') || text.includes('developer') || text.includes('engineer')) {
                    careerPath = 'tech';
                }
                else if (text.includes('marketing') || text.includes('brand') || text.includes('digital')) {
                    careerPath = 'marketing';
                }
                else if (text.includes('data') || text.includes('analyst') || text.includes('analytics')) {
                    careerPath = 'data-analytics';
                }
                else if (text.includes('finance') || text.includes('financial') || text.includes('banking')) {
                    careerPath = 'finance';
                }
                else if (text.includes('business') || text.includes('strategy') || text.includes('consulting')) {
                    careerPath = 'strategy';
                }
                else if (text.includes('design') || text.includes('creative') || text.includes('ux')) {
                    careerPath = 'product';
                }
                const categories = createJobCategories(careerPath, [`loc:${job.location}`, 'type:internship']);
                return Object.assign(Object.assign({}, job), { categories: categories.split('|') });
            });
            this.telemetry.trackCareerTagged(careerTaggedJobs.length);
            // Convert to database format and save
            let inserted = 0;
            let updated = 0;
            if (careerTaggedJobs.length > 0) {
                // Deduplicate by normalized title+company+location to avoid conflicts
                const uniqueJobs = careerTaggedJobs.filter((job, index, self) => {
                    const key = `${job.title}|${job.company}|${job.location}`.toLowerCase();
                    return index === self.findIndex(j => `${j.title}|${j.company}|${j.location}`.toLowerCase() === key);
                });
                console.log(`💾 Saving ${uniqueJobs.length} unique jobs to database (${careerTaggedJobs.length - uniqueJobs.length} duplicates removed)...`);
                // Process jobs in batches
                const batchSize = 50;
                for (let i = 0; i < uniqueJobs.length; i += batchSize) {
                    const batch = uniqueJobs.slice(i, i + batchSize);
                    try {
                        // Convert to database format
                        const dbJobs = batch.map(job => {
                            const dbJob = (0, utils_js_1.convertToDatabaseFormat)(job);
                            // Remove metadata field and ensure we only use existing columns
                            const { metadata } = dbJob, cleanDbJob = __rest(dbJob, ["metadata"]);
                            return Object.assign(Object.assign({}, cleanDbJob), { categories: job.categories || [], source: 'rapidapi-internships', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), is_internship: true, is_graduate: true, is_active: true, status: 'active' // Set status
                             });
                        });
                        // Save to database
                        const { data, error } = await this.supabase
                            .from('jobs')
                            .upsert(dbJobs, {
                            onConflict: 'job_hash',
                            ignoreDuplicates: false
                        });
                        if (error) {
                            console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, error.message);
                            this.telemetry.trackError(`Batch save failed: ${error.message}`);
                        }
                        else {
                            inserted += batch.length;
                            console.log(`✅ Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} jobs saved`);
                            // Track samples for debugging
                            batch.slice(0, 3).forEach(job => {
                                if (this.telemetry.getMetrics().samples.length < 3) {
                                    this.telemetry.trackSample(`${job.title} at ${job.company} (${job.location})`);
                                }
                            });
                        }
                        // Small delay between batches
                        await sleep(100);
                    }
                    catch (error) {
                        console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} error:`, error.message);
                        this.telemetry.trackError(`Batch processing failed: ${error.message}`);
                    }
                }
            }
            this.telemetry.trackInserted(inserted);
            this.telemetry.trackUpdated(updated);
            const metrics = this.telemetry.getMetrics();
            console.log('📈 RapidAPI Internships Results:', {
                raw: metrics.raw,
                eligible: metrics.eligible,
                careerTagged: metrics.careerTagged,
                locationTagged: metrics.locationTagged,
                inserted: metrics.inserted,
                updated: metrics.updated,
                errors: metrics.errors.length,
                samples: metrics.samples
            });
            // Standardized success line for orchestrator parsing
            console.log(`✅ RapidAPI Internships: ${metrics.inserted} jobs saved to database`);
            return metrics;
        }
        catch (error) {
            console.error('❌ RapidAPI Internships scraping failed:', error.message);
            this.telemetry.trackError(`Scraping failed: ${error.message}`);
            return this.telemetry.getMetrics();
        }
    }
}
exports.RapidAPIInternshipsScraper = RapidAPIInternshipsScraper;
// Export default instance
exports.default = new RapidAPIInternshipsScraper();
