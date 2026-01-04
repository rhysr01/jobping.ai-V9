import crypto from "node:crypto";
import dayjs from "dayjs";

type JobTrack =
	| "consulting"
	| "finance"
	| "strategy"
	| "operations"
	| "marketing"
	| "product"
	| "data"
	| "sustainability"
	| "other";

export function inferTrack(text: string): JobTrack {
	const t = text.toLowerCase();
	if (/(consultant|consulting|advisory)/.test(t)) return "consulting";
	if (/(investment|bank|finance|equity|audit|account)/.test(t))
		return "finance";
	if (/(strategy|corporate strategy|strategic)/.test(t)) return "strategy";
	if (/(operations|supply chain|logistics|ops)/.test(t)) return "operations";
	if (/(marketing|brand|growth|digital marketing)/.test(t)) return "marketing";
	if (/(product manager|product management)/.test(t)) return "product";
	if (/(data analyst|business intelligence|analytics)/.test(t)) return "data";
	if (/(sustainab|esg|csr|climate)/.test(t)) return "sustainability";
	return "other";
}

export function scoreJob(
	title: string,
	description: string,
	postedAt: string,
	track: JobTrack,
) {
	let score = 0;
	const days = dayjs().diff(dayjs(postedAt), "day");
	if (days <= 14) score += 40;
	else if (days <= 28) score += 20;

	const s = `${title} ${description}`.toLowerCase();
	let early = 0;
	if (
		/(graduate programme|graduate program|graduate|entry level|intern|trainee|junior|analyst|rotation|leadership)/.test(
			s,
		)
	)
		early += 20;
	if (/(intern|trainee|rotation|leadership)/.test(s)) early += 15;
	score += Math.min(35, early);

	if (track !== "other") score += 15;

	return Math.max(0, Math.min(100, score));
}

type JobPingJob = {
	id: string;
	title: string;
	company: string;
	companyDomain?: string;
	locationName?: string;
	locationId?: number;
	postedAt?: string;
	seniority?: string;
	source?: string;
	url?: string;
	descriptionSnippet?: string;
	track: JobTrack;
	score: number;
};

export function normalize(job: any): JobPingJob {
	const title = job.title?.trim() ?? "";
	const company = job.company_name ?? job.company ?? "";
	const companyDomain = job.company_domain ?? "";
	const url = job.url ?? job.job_url ?? "";
	const postedAt =
		job.posted_at ?? job.publication_date ?? new Date().toISOString();
	const locationName = job.location?.name ?? job.location_name ?? "";
	const locationId = job.location?.id ?? job.location_id;
	const source = job.source ?? job.job_board ?? "mantiks";
	const seniority = job.seniority ?? "";
	const description = job.description ?? job.snippet ?? "";

	const track = inferTrack(`${title} ${description}`);
	const score = scoreJob(title, description, postedAt, track);

	const hash = crypto
		.createHash("sha256")
		.update(
			`${companyDomain}|${job.external_id ?? url}|${title}|${locationName}|${postedAt}`,
		)
		.digest("hex");

	return {
		id: hash,
		title,
		company,
		companyDomain,
		locationName,
		locationId,
		postedAt,
		seniority,
		source,
		url,
		descriptionSnippet: description.slice(0, 500),
		track,
		score,
	};
}
