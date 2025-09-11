"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyBoard = verifyBoard;
exports.fetchGreenhouseJobs = fetchGreenhouseJobs;
exports.isEarlyCareer = isEarlyCareer;
exports.isEU = isEU;
exports.normalize = normalize;
exports.scrapeGreenhouseBoard = scrapeGreenhouseBoard;
const axios_1 = require("axios");
const crypto = require("crypto");
const smart_strategies_js_1 = require("./smart-strategies.js");
const BASE = "https://boards-api.greenhouse.io/v1/boards";
// Core EU cities for graduating students - standardized across all scrapers
const EU_HINTS = [
    // Core countries
    "UK", "United Kingdom", "Ireland", "Germany", "France", "Spain", "Netherlands", "Denmark", "Sweden", "Switzerland",
    // Core cities (must-haves for graduating students)
    "London", "Dublin", "Berlin", "Amsterdam", "Paris", "Munich", "Madrid", "Stockholm", "Zurich", "Copenhagen",
    // Additional EU coverage
    "Italy", "Austria", "Belgium", "Poland", "Czech", "Portugal", "Finland", "Norway", "Luxembourg", "Greece",
    "Vienna", "Brussels", "Prague", "Warsaw", "Lisbon", "Helsinki", "Oslo", "Athens", "Barcelona", "Milan", "Rome"
];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
/** Verify a board exists (200 on departments OR jobs). */
async function verifyBoard(board) {
    const urls = [
        `${BASE}/${board}/departments`,
        `${BASE}/${board}/jobs`
    ];
    for (const u of urls) {
        try {
            const r = await axios_1.default.get(u, { timeout: 12000, headers: { "Accept": "application/json" } });
            if (r.status === 200)
                return true;
        }
        catch { /* ignore */ }
        await sleep(250);
    }
    return false;
}
/** Fetch jobs with content=true; return [] for 404 (board not found). */
async function fetchGreenhouseJobs(board) {
    // Use smart date strategy for filtering
    const smartMaxDays = (0, smart_strategies_js_1.withFallback)(() => (0, smart_strategies_js_1.getSmartDateStrategy)('greenhouse'), '7');
    const url = `${BASE}/${board}/jobs?content=true`;
    const r = await axios_1.default.get(url, {
        timeout: 20000,
        headers: {
            "User-Agent": "Mozilla/5.0 (compatible; JobPingBot/1.0; +https://jobping.ai/bot)",
            "Accept": "application/json"
        },
        validateStatus: s => s === 200 || s === 404
    });
    if (r.status === 404)
        return [];
    const jobs = (r.data?.jobs ?? []);
    // Apply date filtering based on smart strategy
    if (smartMaxDays && smartMaxDays !== '7') {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(smartMaxDays));
        return jobs.filter(job => {
            if (!job.updated_at)
                return true; // Keep jobs without date info
            const jobDate = new Date(job.updated_at);
            return jobDate >= cutoffDate;
        });
    }
    return jobs;
}
/** Heuristic: grad/entry detection across title, departments, content. */
function isEarlyCareer(j) {
    const hay = [
        j.title,
        ...(j.departments?.map(d => d.name) ?? []),
        (j.content ?? "")
    ].join(" ").toLowerCase();
    const inc = /(graduate|new\s?grad|entry[-\s]?level|intern(ship)?|apprentice|early\s?career|junior|campus|working\sstudent)/i;
    const excl = /(senior|staff|principal|lead|manager|director|head)/i;
    return inc.test(hay) && !excl.test(hay);
}
/** EU filter using location + offices best-effort. */
function isEU(j) {
    const txt = [
        j.location?.name ?? "",
        ...(j.offices?.map(o => o.name) ?? ""),
        j.content ?? ""
    ].join(" ");
    return EU_HINTS.some(h => new RegExp(`\\b${escapeRegExp(h)}\\b`, "i").test(txt)) ||
        /\b(remote[, ]+)?europe\b/i.test(txt);
}
function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
/** Normalizer → your DB shape */
function normalize(board, j, company = null) {
    const departments = (j.departments ?? []).map(d => d.name);
    const offices = (j.offices ?? []).map(o => o.name);
    const loc = j.location?.name || offices.join(", ") || "Unspecified";
    const job_hash = crypto
        .createHash("sha256")
        .update(`gh:${board}:${j.id}:${j.absolute_url}`)
        .digest("hex");
    return {
        job_hash,
        source: "greenhouse",
        board,
        gh_id: j.id,
        title: j.title,
        company,
        url: j.absolute_url,
        location: loc,
        departments,
        offices,
        updated_at: j.updated_at ?? null,
        is_early_career: isEarlyCareer(j)
    };
}
/** One-shot for a board slug → normalized, filtered jobs. */
async function scrapeGreenhouseBoard(board, opts) {
    if (!(await verifyBoard(board)))
        return [];
    const raw = await fetchGreenhouseJobs(board);
    let jobs = raw;
    if (opts?.earlyOnly !== false)
        jobs = jobs.filter(isEarlyCareer);
    if (opts?.euOnly !== false)
        jobs = jobs.filter(isEU);
    return jobs.map(j => normalize(board, j, opts?.company ?? null));
}
