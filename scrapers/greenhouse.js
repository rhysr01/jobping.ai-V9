"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyBoard = verifyBoard;
exports.fetchGreenhouseJobs = fetchGreenhouseJobs;
exports.isEarlyCareer = isEarlyCareer;
exports.isEU = isEU;
exports.normalize = normalize;
exports.scrapeGreenhouseBoard = scrapeGreenhouseBoard;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
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
        catch ( /* ignore */_a) { /* ignore */ }
        await sleep(250);
    }
    return false;
}
/** Fetch jobs with content=true; return [] for 404 (board not found). */
async function fetchGreenhouseJobs(board) {
    var _a, _b;
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
    const jobs = ((_b = (_a = r.data) === null || _a === void 0 ? void 0 : _a.jobs) !== null && _b !== void 0 ? _b : []);
    return jobs;
}
/** Heuristic: grad/entry detection across title, departments, content. */
function isEarlyCareer(j) {
    var _a, _b, _c;
    const hay = [
        j.title,
        ...((_b = (_a = j.departments) === null || _a === void 0 ? void 0 : _a.map(d => d.name)) !== null && _b !== void 0 ? _b : []),
        ((_c = j.content) !== null && _c !== void 0 ? _c : "")
    ].join(" ").toLowerCase();
    const inc = /(graduate|new\s?grad|entry[-\s]?level|intern(ship)?|apprentice|early\s?career|junior|campus|working\sstudent)/i;
    const excl = /(senior|staff|principal|lead|manager|director|head)/i;
    return inc.test(hay) && !excl.test(hay);
}
/** EU filter using location + offices best-effort. */
function isEU(j) {
    var _a, _b, _c, _d, _e;
    const txt = [
        (_b = (_a = j.location) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : "",
        ...((_d = (_c = j.offices) === null || _c === void 0 ? void 0 : _c.map(o => o.name)) !== null && _d !== void 0 ? _d : ""),
        (_e = j.content) !== null && _e !== void 0 ? _e : ""
    ].join(" ");
    return EU_HINTS.some(h => new RegExp(`\\b${escapeRegExp(h)}\\b`, "i").test(txt)) ||
        /\b(remote[, ]+)?europe\b/i.test(txt);
}
function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
/** Normalizer → your DB shape */
function normalize(board, j, company = null) {
    var _a, _b, _c, _d;
    const departments = ((_a = j.departments) !== null && _a !== void 0 ? _a : []).map(d => d.name);
    const offices = ((_b = j.offices) !== null && _b !== void 0 ? _b : []).map(o => o.name);
    const loc = ((_c = j.location) === null || _c === void 0 ? void 0 : _c.name) || offices.join(", ") || "Unspecified";
    const job_hash = crypto_1.default
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
        updated_at: (_d = j.updated_at) !== null && _d !== void 0 ? _d : null,
        is_early_career: isEarlyCareer(j)
    };
}
/** One-shot for a board slug → normalized, filtered jobs. */
async function scrapeGreenhouseBoard(board, opts) {
    if (!(await verifyBoard(board)))
        return [];
    const raw = await fetchGreenhouseJobs(board);
    let jobs = raw;
    if ((opts === null || opts === void 0 ? void 0 : opts.earlyOnly) !== false)
        jobs = jobs.filter(isEarlyCareer);
    if ((opts === null || opts === void 0 ? void 0 : opts.euOnly) !== false)
        jobs = jobs.filter(isEU);
    return jobs.map(j => { var _a; return normalize(board, j, (_a = opts === null || opts === void 0 ? void 0 : opts.company) !== null && _a !== void 0 ? _a : null); });
}
