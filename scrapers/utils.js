"use strict";
/**
 * Scraper Helper Functions
 * Simplified job processing utilities for the IngestJob format
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyEarlyCareer = classifyEarlyCareer;
exports.inferRole = inferRole;
exports.parseLocation = parseLocation;
exports.makeJobHash = makeJobHash;
exports.validateJob = validateJob;
exports.convertToDatabaseFormat = convertToDatabaseFormat;
exports.shouldSaveJob = shouldSaveJob;
exports.logJobProcessing = logJobProcessing;
/**
 * Classify if a job is early-career based on title and description
 * Implements the "save-first" philosophy: if it's early-career and in Europe, save it
 */
function classifyEarlyCareer(job) {
    const { title, description } = job;
    const text = `${title} ${description}`;
    // ✅ COMPREHENSIVE: Multilingual early career detection based on user research
    const graduateRegex = /(graduate|new.?grad|recent.?graduate|campus.?hire|graduate.?scheme|graduate.?program|rotational.?program|university.?hire|college.?hire|entry.?level|junior|trainee|intern|internship|placement|analyst|assistant|fellowship|apprenticeship|apprentice|stagiaire|alternant|alternance|d[ée]butant|formation|dipl[oô]m[eé]|apprenti|poste.?d.?entr[ée]e|niveau.?d[ée]butant|praktikum|praktikant|traineeprogramm|berufseinstieg|absolvent|absolventenprogramm|ausbildung|auszubildende|werkstudent|einsteiger|becario|pr[aá]cticas|programa.?de.?graduados|reci[eé]n.?titulado|aprendiz|nivel.?inicial|puesto.?de.?entrada|j[uú]nior|formaci[oó]n.?dual|tirocinio|stagista|apprendista|apprendistato|neolaureato|formazione|inserimento.?lavorativo|stage|stagiair|starterfunctie|traineeship|afgestudeerde|leerwerkplek|instapfunctie|fresher|nyuddannet|nyutdannet|nyexaminerad|neo.?laureato|nuovo.?laureato|recién.?graduado|nuevo.?graduado|joven.?profesional|nieuwe.?medewerker)/i;
    // ✅ FIXED: More precise senior role exclusion - don't exclude "specialist" or "expert" in junior roles
    const seniorRegex = /(senior|lead|principal|manager|director|head.?of|vp|chief|executive|5\+.?years|7\+.?years|10\+.?years|experienced|architect|consultant|advisory|strategic|executive|management|team.?lead|tech.?lead|staff|distinguished)/i;
    // ✅ FIXED: Only exclude roles requiring significant experience (3+ years), not 1-2 years
    const experienceRegex = /(proven.?track.?record|extensive.?experience|minimum.?3.?years|minimum.?5.?years|minimum.?7.?years|prior.?experience|relevant.?experience|3\+.?years|5\+.?years|7\+.?years|10\+.?years)/i;
    return graduateRegex.test(text) && !seniorRegex.test(text) && !experienceRegex.test(text);
}
/**
 * Infer the role/career path from job title and description
 */
function inferRole(job) {
    const { title, description } = job;
    const text = `${title} ${description}`.toLowerCase();
    // Role mappings
    const rolePatterns = [
        { pattern: /software\s+(?:engineer|developer|programmer)/i, role: 'software-engineering' },
        { pattern: /data\s+(?:scientist|analyst|engineer)/i, role: 'data-science' },
        { pattern: /product\s+(?:manager|owner)/i, role: 'product-management' },
        { pattern: /marketing/i, role: 'marketing' },
        { pattern: /sales/i, role: 'sales' },
        { pattern: /design(?:er)?/i, role: 'design' },
        { pattern: /finance/i, role: 'finance' },
        { pattern: /hr|human\s+resources/i, role: 'hr' },
        { pattern: /operations/i, role: 'operations' },
        { pattern: /consultant/i, role: 'consulting' },
        { pattern: /research/i, role: 'research' },
        { pattern: /business\s+(?:analyst|intelligence)/i, role: 'business-analytics' },
        { pattern: /devops/i, role: 'devops' },
        { pattern: /frontend/i, role: 'frontend-development' },
        { pattern: /backend/i, role: 'backend-development' },
        { pattern: /full\s+stack/i, role: 'full-stack-development' },
        { pattern: /mobile\s+(?:developer|engineer)/i, role: 'mobile-development' },
        { pattern: /qa|quality\s+assurance|test/i, role: 'quality-assurance' },
        { pattern: /security/i, role: 'cybersecurity' },
        { pattern: /ai|machine\s+learning|ml/i, role: 'ai-ml' }
    ];
    // Find the first matching role pattern
    for (const { pattern, role } of rolePatterns) {
        if (pattern.test(text)) {
            return role;
        }
    }
    // Default to general if no specific role is found
    return 'general';
}
/**
 * Parse and standardize location information
 */
function parseLocation(location) {
    const loc = location.toLowerCase().trim();
    // Check for remote indicators
    const isRemote = /remote|work\s+from\s+home|wfh|anywhere/i.test(loc);
    // EU countries
    const euCountries = [
        'austria', 'belgium', 'bulgaria', 'croatia', 'cyprus', 'czech republic',
        'denmark', 'estonia', 'finland', 'france', 'germany', 'greece', 'hungary',
        'ireland', 'italy', 'latvia', 'lithuania', 'luxembourg', 'malta',
        'netherlands', 'poland', 'portugal', 'romania', 'slovakia', 'slovenia',
        'spain', 'sweden', 'united kingdom', 'uk', 'germany', 'france', 'spain',
        'italy', 'netherlands', 'belgium', 'austria', 'switzerland', 'norway',
        'denmark', 'sweden', 'finland', 'poland', 'czech republic', 'hungary',
        'romania', 'bulgaria', 'croatia', 'slovenia', 'slovakia', 'estonia',
        'latvia', 'lithuania', 'malta', 'cyprus', 'luxembourg', 'ireland',
        'portugal', 'greece'
    ];
    // Check if location contains EU country
    const isEU = euCountries.some(country => loc.includes(country));
    // Extract city (simplified - first part before comma or space)
    const cityMatch = loc.match(/^([^,]+)/);
    const city = cityMatch ? cityMatch[1].trim() : location;
    // Extract country (after comma or from the end)
    const countryMatch = loc.match(/,?\s*([a-z\s]+)$/);
    const country = countryMatch ? countryMatch[1].trim() : '';
    return {
        city: city || location,
        country: country,
        isRemote,
        isEU: isEU || isRemote // Consider remote jobs as potentially EU
    };
}
/**
 * Generate a consistent job hash for deduplication
 */
function makeJobHash(job) {
    const { title, company, location } = job;
    // Normalize the data
    const normalizedTitle = title.toLowerCase().trim().replace(/\s+/g, ' ');
    const normalizedCompany = company.toLowerCase().trim().replace(/\s+/g, ' ');
    const normalizedLocation = location.toLowerCase().trim().replace(/\s+/g, ' ');
    // Create hash string
    const hashString = `${normalizedTitle}|${normalizedCompany}|${normalizedLocation}`;
    // Simple hash function (in production, you might want to use crypto)
    let hash = 0;
    for (let i = 0; i < hashString.length; i++) {
        const char = hashString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
}
/**
 * Validate if a job meets basic requirements
 */
function validateJob(job) {
    const errors = [];
    if (!job.title || job.title.trim().length === 0) {
        errors.push('Title is required');
    }
    if (!job.company || job.company.trim().length === 0) {
        errors.push('Company is required');
    }
    if (!job.location || job.location.trim().length === 0) {
        errors.push('Location is required');
    }
    if (!job.description || job.description.trim().length === 0) {
        errors.push('Description is required');
    }
    if (!job.url || job.url.trim().length === 0) {
        errors.push('URL is required');
    }
    if (!job.source || job.source.trim().length === 0) {
        errors.push('Source is required');
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
/**
 * Convert IngestJob to the format expected by the database
 */
function convertToDatabaseFormat(job) {
    const { city, country, isRemote, isEU } = parseLocation(job.location);
    const isEarlyCareer = classifyEarlyCareer(job);
    const jobHash = makeJobHash(job);
    // ✅ Log early career classification for debugging
    console.log(`🎯 Early Career: "${job.title}" - ${isEarlyCareer ? 'YES' : 'NO'}`);
    return {
        job_hash: jobHash,
        title: job.title.trim(),
        company: job.company.trim(),
        location: job.location.trim(),
        description: job.description.trim(),
        job_url: job.url.trim(),
        source: job.source.trim(),
        posted_at: job.posted_at || new Date().toISOString(),
        categories: [isEarlyCareer ? 'early-career' : 'experienced'],
        work_environment: isRemote ? 'remote' : 'on-site',
        experience_required: isEarlyCareer ? 'entry-level' : 'experienced',
        company_profile_url: '',
        language_requirements: [],
        scrape_timestamp: new Date().toISOString(),
        original_posted_date: job.posted_at || new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        is_active: true,
        created_at: new Date().toISOString(),
        // Additional metadata
        metadata: {
            city,
            country,
            isRemote,
            isEU,
            isEarlyCareer,
            parsedAt: new Date().toISOString()
        }
    };
}
/**
 * Check if a job should be saved based on the north-star rule
 * "If it's early-career and in Europe, save it"
 */
function shouldSaveJob(job) {
    const { isEU } = parseLocation(job.location);
    const isEarlyCareer = classifyEarlyCareer(job);
    // North-star rule: save if early-career and in Europe
    return isEarlyCareer && isEU;
}
/**
 * Log job processing for debugging
 */
function logJobProcessing(job, action, details) {
    const { isEU } = parseLocation(job.location);
    const isEarlyCareer = classifyEarlyCareer(job);
    console.log(`[${action}] ${job.company} - ${job.title}`);
    console.log(`  Location: ${job.location} (EU: ${isEU})`);
    console.log(`  Early Career: ${isEarlyCareer}`);
    console.log(`  Should Save: ${shouldSaveJob(job)}`);
    if (details) {
        console.log(`  Details:`, details);
    }
}
