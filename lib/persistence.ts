import type { SupabaseClient } from "@supabase/supabase-js";
import { getDatabaseClient } from "@/Utils/databasePool";

// Use centralized database pool instead of creating separate client
function getClient(): SupabaseClient {
	return getDatabaseClient();
}

export async function upsertRaw(jobs: any[]) {
	if (!jobs?.length) return;
	const payload = jobs.map((j) => ({
		external_id: j.external_id ?? j.id ?? null,
		company: j.company_name ?? j.company ?? null,
		company_domain: j.company_domain ?? null,
		title: j.title ?? null,
		description: j.description ?? null,
		location_name: j.location?.name ?? j.location_name ?? null,
		location_id: j.location?.id ?? j.location_id ?? null,
		seniority: j.seniority ?? null,
		posted_at: j.posted_at ?? j.publication_date ?? null,
		source: j.source ?? j.job_board ?? "mantiks",
		url: j.url ?? j.job_url ?? null,
	}));

	const { error } = await getClient()
		.from("jobs_raw_mantiks")
		.upsert(payload, { onConflict: "company_domain,external_id" });
	if (error) throw error;
}

export async function upsertNorm(items: any[]) {
	if (!items?.length) return;
	const { error } = await getClient().from("jobs_norm").upsert(items);
	if (error) throw error;
}
