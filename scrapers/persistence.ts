import supabasePkg from '@supabase/supabase-js';
const { createClient } = supabasePkg as any;

type IngestJob = {
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  posted_at?: string;
  source?: string;
};

function getSupabase(): any {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/ANON_KEY in env');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function makeJobHash(job: IngestJob): string {
  const normalized = `${job.title || ''}-${job.company || ''}-${job.location || ''}`
    .toLowerCase()
    .replace(/\s+/g, '-');
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) - hash) + normalized.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export async function saveJobsToSupabase(jobs: IngestJob[], source: string): Promise<{ saved: number; errors: number }> {
  const supabase = getSupabase();
  const nowIso = new Date().toISOString();

  // Filter out remote jobs
  const nonRemoteJobs = (jobs || []).filter(j => !((j.location || '').toLowerCase().includes('remote')));

  // Convert to DB rows
  const dbRows = nonRemoteJobs.map(j => ({
    job_hash: makeJobHash(j),
    title: (j.title || '').trim(),
    company: (j.company || '').trim(),
    location: (j.location || '').trim(),
    description: (j.description || '').trim(),
    job_url: (j.url || '').trim(),
    source: source,
    posted_at: j.posted_at || nowIso,
    categories: ['early-career'],
    work_environment: 'on-site',
    experience_required: 'entry-level',
    original_posted_date: j.posted_at || nowIso,
    last_seen_at: nowIso,
    is_active: true,
    created_at: nowIso
  }));

  // Deduplicate by job_hash
  const unique = Array.from(new Map(dbRows.map(r => [r.job_hash, r])).values());

  const batchSize = 150;
  let saved = 0;
  let errors = 0;
  for (let i = 0; i < unique.length; i += batchSize) {
    const slice = unique.slice(i, i + batchSize);
    const { error, count } = await supabase
      .from('jobs')
      .upsert(slice, { onConflict: 'job_hash', ignoreDuplicates: false, count: 'exact' });
    if (error) {
      console.error('Batch upsert error:', error.message);
      errors += slice.length;
    } else {
      saved += count || slice.length;
    }
  }

  console.log(`✅ ${source}: ${saved} jobs saved to database`);
  return { saved, errors };
}


