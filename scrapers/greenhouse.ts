import axios from "axios";
import * as crypto from "crypto";
import { getSmartDateStrategy, getSmartPaginationStrategy, withFallback } from './smart-strategies';

const BASE = "https://boards-api.greenhouse.io/v1/boards";

// Core EU cities for graduating students - standardized across all scrapers
const EU_HINTS = [
  // Core countries
  "UK","United Kingdom","Ireland","Germany","France","Spain","Netherlands","Denmark","Sweden","Switzerland",
  // Core cities (must-haves for graduating students)
  "London","Dublin","Berlin","Amsterdam","Paris","Munich","Madrid","Stockholm","Zurich","Copenhagen",
  // Additional EU coverage
  "Italy","Austria","Belgium","Poland","Czech","Portugal","Finland","Norway","Luxembourg","Greece",
  "Vienna","Brussels","Prague","Warsaw","Lisbon","Helsinki","Oslo","Athens","Barcelona","Milan","Rome"
];

export type GHJob = {
  id: number;
  title: string;
  absolute_url: string;
  updated_at?: string;
  location?: { name?: string };
  departments?: { id: number; name: string }[];
  offices?: { id: number; name: string }[];
  content?: string;           // HTML
  metadata?: Array<{ name: string; value: string }>;
};

export type NormalizedJob = {
  job_hash: string;
  source: "greenhouse";
  board: string;
  gh_id: number;
  title: string;
  company: string | null;     // often not provided by GH board; set from your seed list if you have it
  url: string;
  location: string;
  departments: string[];
  offices: string[];
  updated_at: string | null;
  is_early_career: boolean;
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Verify a board exists (200 on departments OR jobs). */
export async function verifyBoard(board: string): Promise<boolean> {
  const urls = [
    `${BASE}/${board}/departments`,
    `${BASE}/${board}/jobs`
  ];
  for (const u of urls) {
    try {
      const r = await axios.get(u, { timeout: 12000, headers: { "Accept": "application/json" } });
      if (r.status === 200) return true;
    } catch { /* ignore */ }
    await sleep(250);
  }
  return false;
}

/** Fetch jobs with content=true; return [] for 404 (board not found). */
export async function fetchGreenhouseJobs(board: string): Promise<GHJob[]> {
  // Use smart date strategy for filtering
  const smartMaxDays = withFallback(() => getSmartDateStrategy('greenhouse'), '7');
  
  const url = `${BASE}/${board}/jobs?content=true`;
  const r = await axios.get(url, {
    timeout: 20000,
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; JobPingBot/1.0; +https://jobping.ai/bot)",
      "Accept": "application/json"
    },
    validateStatus: s => s === 200 || s === 404
  });
  if (r.status === 404) return [];
  const jobs = (r.data?.jobs ?? []) as GHJob[];
  
  // Apply date filtering based on smart strategy
  if (smartMaxDays && smartMaxDays !== '7') {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(smartMaxDays));
    
    return jobs.filter(job => {
      if (!job.updated_at) return true; // Keep jobs without date info
      const jobDate = new Date(job.updated_at);
      return jobDate >= cutoffDate;
    });
  }
  
  return jobs;
}

/** Heuristic: grad/entry detection across title, departments, content. */
export function isEarlyCareer(j: GHJob): boolean {
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
export function isEU(j: GHJob): boolean {
  const txt = [
    j.location?.name ?? "",
    ...(j.offices?.map(o => o.name) ?? ""),
    j.content ?? ""
  ].join(" ");
  return EU_HINTS.some(h => new RegExp(`\\b${escapeRegExp(h)}\\b`, "i").test(txt)) ||
         /\b(remote[, ]+)?europe\b/i.test(txt);
}

function escapeRegExp(s: string){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/** Normalizer → your DB shape */
export function normalize(board: string, j: GHJob, company: string | null = null): NormalizedJob {
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
export async function scrapeGreenhouseBoard(board: string, opts?: { company?: string | null; euOnly?: boolean; earlyOnly?: boolean }): Promise<NormalizedJob[]> {
  if (!(await verifyBoard(board))) return [];
  const raw = await fetchGreenhouseJobs(board);

  let jobs = raw;
  if (opts?.earlyOnly !== false) jobs = jobs.filter(isEarlyCareer);
  if (opts?.euOnly !== false)    jobs = jobs.filter(isEU);

  return jobs.map(j => normalize(board, j, opts?.company ?? null));
}

/**
 * Backwards-compatible API used by tests: scrapeGreenhouse(company, runId)
 * Accepts a company object with at least a 'board' field and optional name.
 */
export async function scrapeGreenhouse(
  company: { board: string; name?: string },
  _runId?: string
): Promise<NormalizedJob[]> {
  const board = company.board;
  const companyName = company.name ?? undefined;
  return scrapeGreenhouseBoard(board, { company: companyName ?? null, euOnly: true, earlyOnly: true });
}
