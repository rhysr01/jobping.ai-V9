"use strict";
// types.ts - Corrected to match your actual Supabase schema
Object.defineProperty(exports, "__esModule", { value: true });
exports.TARGET_CITIES = exports.CAREER_PATHS = exports.VISA_STATUS_OPTIONS = exports.WORK_ENVIRONMENTS = exports.CAREER_PATH_SYNONYMS = exports.CAREER_PATH_PRIORITY = exports.CANONICAL_CAREER_PATHS = exports.CAREER_TAXONOMY_VERSION = exports.FreshnessTier = void 0;
exports.mapTallyDataToUser = mapTallyDataToUser;
exports.extractTallyFormData = extractTallyFormData;
exports.isValidJob = isValidJob;
exports.isValidUser = isValidUser;
exports.normalizeCareerPath = normalizeCareerPath;
exports.testCareerPathNormalization = testCareerPathNormalization;
exports.createJobCategories = createJobCategories;
exports.extractCareerPathFromCategories = extractCareerPathFromCategories;
exports.addTagToCategories = addTagToCategories;
exports.calculateCareerPathTelemetry = calculateCareerPathTelemetry;
// Freshness tiers for job prioritization
var FreshnessTier;
(function (FreshnessTier) {
    FreshnessTier["ULTRA_FRESH"] = "ultra_fresh";
    FreshnessTier["FRESH"] = "fresh";
    FreshnessTier["COMPREHENSIVE"] = "comprehensive"; // > 3 days
})(FreshnessTier || (exports.FreshnessTier = FreshnessTier = {}));
// Function to map Tally form data to User record
function mapTallyDataToUser(tallyData) {
    var _a;
    return {
        email: tallyData.email,
        full_name: tallyData.full_name,
        professional_expertise: tallyData.professional_expertise,
        start_date: tallyData.start_date,
        work_environment: tallyData.work_environment,
        visa_status: tallyData.visa_status,
        entry_level_preference: tallyData.entry_level_preference,
        career_path: tallyData.career_path,
        cv_url: '', // Default empty - will be updated later
        linkedin_url: '', // Default empty - will be updated later
        languages_spoken: tallyData.languages_spoken.split(',').map(lang => lang.trim()),
        company_types: tallyData.company_types.split(',').map(type => type.trim()),
        roles_selected: tallyData.roles_selected.split(',').map(role => role.trim()),
        target_cities: ((_a = tallyData.target_cities) === null || _a === void 0 ? void 0 : _a.split(',').map(city => city.trim())) || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
}
// Function to extract Tally form data from webhook payload
function extractTallyFormData(payload) {
    const userData = {};
    payload.data.fields.forEach(field => {
        const value = Array.isArray(field.value) ? field.value.join(', ') : field.value;
        // Map Tally field keys to our data structure
        switch (field.key.toLowerCase()) {
            case 'full_name':
            case 'name':
                userData.full_name = value;
                break;
            case 'email':
            case 'email_address':
                userData.email = value;
                break;
            case 'professional_expertise':
            case 'background':
            case 'expertise':
                userData.professional_expertise = value;
                break;
            case 'roles_selected':
            case 'target_roles':
            case 'preferred_roles':
                userData.roles_selected = value;
                break;
            case 'work_environment':
            case 'work_preference':
                userData.work_environment = value;
                break;
            case 'career_path':
                userData.career_path = value;
                break;
            case 'start_date':
            case 'availability':
                userData.start_date = value;
                break;
            case 'languages_spoken':
            case 'languages':
                userData.languages_spoken = value;
                break;
            case 'visa_status':
                userData.visa_status = value;
                break;
            case 'entry_level_preference':
            case 'experience_level':
                userData.entry_level_preference = value;
                break;
            case 'company_types':
            case 'company_preference':
                userData.company_types = value;
                break;
            case 'target_cities':
                userData.target_cities = value;
                break;
        }
    });
    return userData;
}
// Type guards for validation
function isValidJob(obj) {
    return (typeof obj.title === 'string' &&
        typeof obj.company === 'string' &&
        typeof obj.location === 'string' &&
        typeof obj.job_url === 'string' &&
        typeof obj.description === 'string' &&
        typeof obj.job_hash === 'string' &&
        typeof obj.source === 'string');
}
function isValidUser(obj) {
    return (typeof obj.email === 'string' &&
        typeof obj.full_name === 'string' &&
        obj.email.includes('@'));
}
// Career Path Taxonomy Version 1.0
exports.CAREER_TAXONOMY_VERSION = 1;
// Canonical career paths - Single source of truth (match Tally exactly)
exports.CANONICAL_CAREER_PATHS = [
    'strategy', // Strategy & Business Design
    'data-analytics', // Data Analytics
    'retail-luxury', // Retail & Luxury
    'sales', // Sales & Client Success
    'marketing', // Marketing
    'finance', // Finance
    'operations', // Operations & Supply Chain
    'product', // Product & Innovation
    'tech', // Tech & Transformation
    'sustainability', // Sustainability & ESG
    'entrepreneurship', // Entrepreneurship
    'unsure', // I'm not sure yet
    'unknown' // Could not infer the job's path
];
// Tie-break priority order (higher index = higher priority)
exports.CAREER_PATH_PRIORITY = {
    'product': 9,
    'data-analytics': 8,
    'marketing': 7,
    'operations': 6,
    'finance': 5,
    'strategy': 4,
    'sales': 3,
    'tech': 2,
    'sustainability': 1,
    'retail-luxury': 0,
    'entrepreneurship': 0,
    'unsure': -1,
    'unknown': -2
};
// Synonym → slug mapping dictionary
exports.CAREER_PATH_SYNONYMS = {
    // Strategy synonyms
    'business development': 'strategy',
    'biz dev': 'sales',
    'management consulting': 'strategy',
    'advisory': 'strategy',
    'business strategy': 'strategy',
    'strategic': 'strategy',
    // Data Analytics synonyms
    'data analyst': 'data-analytics',
    'business analyst': 'data-analytics',
    'ba': 'data-analytics',
    'analytics': 'data-analytics',
    'business intelligence': 'data-analytics',
    'bi': 'data-analytics',
    'data science': 'data-analytics',
    'machine learning': 'data-analytics',
    'ml': 'data-analytics',
    'ai': 'data-analytics',
    'artificial intelligence': 'data-analytics',
    // Retail & Luxury synonyms
    'retail': 'retail-luxury',
    'luxury': 'retail-luxury',
    'fashion': 'retail-luxury',
    'merchandising': 'retail-luxury',
    'buying': 'retail-luxury',
    // Sales synonyms
    'sales representative': 'sales',
    'account executive': 'sales',
    'client success': 'sales',
    'customer success': 'sales',
    'account manager': 'sales',
    'sales development': 'sales',
    'revenue': 'sales',
    // Marketing synonyms
    'brand': 'marketing',
    'digital marketing': 'marketing',
    'social media': 'marketing',
    'content': 'marketing',
    'advertising': 'marketing',
    'brand manager': 'marketing',
    'growth': 'marketing',
    // Finance synonyms
    'financial': 'finance',
    'investment': 'finance',
    'banking': 'finance',
    'accounting': 'finance',
    'audit': 'finance',
    'treasury': 'finance',
    'corporate finance': 'finance',
    // Operations synonyms
    'supply chain': 'operations',
    'logistics': 'operations',
    'procurement': 'operations',
    'manufacturing': 'operations',
    'production': 'operations',
    'quality assurance': 'operations',
    'inventory': 'operations',
    // Product synonyms
    'product manager': 'product',
    'product owner': 'product',
    'product development': 'product',
    'user experience': 'product',
    'ux': 'product',
    'user interface': 'product',
    'ui': 'product',
    'product design': 'product',
    // Tech synonyms
    'software': 'tech',
    'developer': 'tech',
    'engineer': 'tech',
    'programming': 'tech',
    'coding': 'tech',
    'technology': 'tech',
    'technical': 'tech',
    'engineering': 'tech',
    'devops': 'tech',
    'cybersecurity': 'tech',
    'infrastructure': 'tech',
    // Sustainability synonyms
    'esg': 'sustainability',
    'environmental': 'sustainability',
    'social responsibility': 'sustainability',
    'corporate responsibility': 'sustainability',
    'green': 'sustainability',
    'climate': 'sustainability',
    'renewable': 'sustainability',
    // Entrepreneurship synonyms
    'startup': 'entrepreneurship',
    'entrepreneur': 'entrepreneurship',
    'founder': 'entrepreneurship',
    'co-founder': 'entrepreneurship',
    'innovation': 'entrepreneurship',
    'venture': 'entrepreneurship'
};
// Legacy constants (deprecated - use CANONICAL_CAREER_PATHS instead)
exports.WORK_ENVIRONMENTS = [
    'remote', 'hybrid', 'office', 'no-preference'
];
exports.VISA_STATUS_OPTIONS = [
    'eu-citizen', 'non-eu-visa-required', 'non-eu-no-visa'
];
exports.CAREER_PATHS = [
    'consulting', 'finance', 'tech', 'marketing', 'operations', 'entrepreneurship'
];
exports.TARGET_CITIES = [
    'Madrid', 'Dublin', 'London', 'Amsterdam', 'Berlin',
    'Paris', 'Stockholm', 'Zurich'
];
// Enhanced career path normalization with synonym mapping and tie-breaking
function normalizeCareerPath(input) {
    if (!input)
        return ['unsure'];
    // Handle array input - collect all valid matches
    const paths = Array.isArray(input) ? input : [input];
    const validMatches = [];
    for (const path of paths) {
        if (!path)
            continue;
        // Try exact match first
        if (exports.CANONICAL_CAREER_PATHS.includes(path)) {
            validMatches.push(path);
            continue;
        }
        // Try case-insensitive match
        const normalizedPath = path.toLowerCase().trim();
        const match = exports.CANONICAL_CAREER_PATHS.find(cp => cp === normalizedPath);
        if (match) {
            validMatches.push(match);
            continue;
        }
        // Try synonym mapping
        const synonymMatch = exports.CAREER_PATH_SYNONYMS[normalizedPath];
        if (synonymMatch && exports.CANONICAL_CAREER_PATHS.includes(synonymMatch)) {
            validMatches.push(synonymMatch);
            continue;
        }
    }
    // If no valid matches found, return unsure
    if (validMatches.length === 0) {
        return ['unsure'];
    }
    // If multiple matches, use tie-break priority
    if (validMatches.length > 1) {
        // Sort by priority (higher number = higher priority)
        validMatches.sort((a, b) => {
            const priorityA = exports.CAREER_PATH_PRIORITY[a] || -999;
            const priorityB = exports.CAREER_PATH_PRIORITY[b] || -999;
            return priorityB - priorityA; // Descending order
        });
        // Log warning for multiple matches
        console.warn(`⚠️ Multiple career paths detected: ${validMatches.join(', ')}. Using highest priority: ${validMatches[0]}`);
    }
    // Return single highest priority match
    return [validMatches[0]];
}
// Test function for career path normalization (for development/debugging)
function testCareerPathNormalization() {
    const testCases = [
        { input: 'strategy', expected: ['strategy'] },
        { input: 'Strategy', expected: ['strategy'] },
        { input: 'STRATEGY', expected: ['strategy'] },
        { input: 'data-analytics', expected: ['data-analytics'] },
        { input: 'Data Analytics', expected: ['data-analytics'] },
        { input: 'tech', expected: ['tech'] },
        { input: 'Technology', expected: ['tech'] },
        { input: 'unknown', expected: ['unknown'] },
        { input: 'invalid-path', expected: ['unsure'] },
        { input: null, expected: ['unsure'] },
        { input: undefined, expected: ['unsure'] },
        { input: '', expected: ['unsure'] },
        { input: ['strategy', 'tech'], expected: ['strategy'] }, // First valid wins
        { input: ['invalid', 'tech'], expected: ['tech'] }, // Second valid wins
        { input: ['invalid1', 'invalid2'], expected: ['unsure'] }, // No valid found
    ];
    console.log('🧪 Testing career path normalization:');
    testCases.forEach(({ input, expected }) => {
        const result = normalizeCareerPath(input);
        const passed = JSON.stringify(result) === JSON.stringify(expected);
        console.log(`${passed ? '✅' : '❌'} "${input}" → ${JSON.stringify(result)} (expected: ${JSON.stringify(expected)})`);
    });
}
// Job categories tag management
function createJobCategories(careerPath, additionalTags = []) {
    const tags = [`career:${careerPath}`, ...additionalTags];
    // Deduplicate, sort, and clean tags
    const uniqueTags = [...new Set(tags)]
        .map(tag => tag.toLowerCase().trim())
        .filter(tag => tag.length > 0)
        .sort();
    // Join with pipe delimiter and truncate to safe length
    const result = uniqueTags.join('|');
    return result.length > 512 ? result.substring(0, 512) : result;
}
function extractCareerPathFromCategories(categories) {
    if (!categories)
        return 'unknown';
    // Normalize categories to string before parsing
    const normalizedCategories = typeof categories === 'string' ? categories :
        Array.isArray(categories) ? categories.filter(Boolean).join('|') : 'career:unknown|loc:unknown';
    const tags = normalizedCategories.split('|');
    const careerTag = tags.find((tag) => tag.startsWith('career:'));
    if (careerTag) {
        const careerPath = careerTag.replace('career:', '');
        return exports.CANONICAL_CAREER_PATHS.includes(careerPath) ? careerPath : 'unknown';
    }
    return 'unknown';
}
function addTagToCategories(categories, newTag) {
    const tags = categories ? categories.split('|') : [];
    tags.push(newTag);
    return createJobCategories('unknown', tags); // We'll extract the career path from existing tags
}
function calculateCareerPathTelemetry(jobs) {
    const telemetry = {
        totalJobs: jobs.length,
        jobsWithCareerPath: 0,
        unknownJobs: 0,
        careerPathDistribution: {},
        unknownPercentage: 0,
        taxonomyVersion: exports.CAREER_TAXONOMY_VERSION
    };
    jobs.forEach(job => {
        const careerPath = extractCareerPathFromCategories(job.categories || '');
        if (careerPath === 'unknown') {
            telemetry.unknownJobs++;
        }
        else {
            telemetry.jobsWithCareerPath++;
            telemetry.careerPathDistribution[careerPath] = (telemetry.careerPathDistribution[careerPath] || 0) + 1;
        }
    });
    telemetry.unknownPercentage = telemetry.totalJobs > 0 ? (telemetry.unknownJobs / telemetry.totalJobs) * 100 : 0;
    return telemetry;
}
