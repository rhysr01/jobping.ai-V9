import { englishSeeds, excludeNoise, localPacks } from "./config";
import { mantiks } from "./mantiks";

type Lang = "es" | "fr" | "de" | "it" | "en";

export async function fetchCompanyJobs(
	companyDomain: string,
	langs: Lang[],
	locationIds?: number[],
) {
	const include = [...englishSeeds, ...langs.flatMap((l) => localPacks[l])];
	const { data } = await mantiks.get("/company/jobs", {
		params: {
			company_domain: companyDomain,
			include_title: include,
			include_description: include,
			exclude_keywords: excludeNoise,
			location_ids: locationIds,
			job_age_in_days: 14,
		},
	});
	return data?.jobs ?? [];
}
