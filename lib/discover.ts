import { englishSeeds, excludeNoise, localPacks } from "./config";
import { mantiks } from "./mantiks";

type Lang = "es" | "fr" | "de" | "it" | "en";

export type DiscoverParams = {
	locationIds: number[];
	langs: Lang[];
	industries?: string[];
	page?: number;
};

export async function discoverCompanies(params: DiscoverParams) {
	const include = [
		...englishSeeds,
		...params.langs.flatMap((l) => localPacks[l]),
	];
	const minAgeDays = 14; // 7-14 for discovery per credit model
	const { data } = await mantiks.get("/company/search", {
		params: {
			job_title: include,
			job_description: include,
			job_title_exclude: excludeNoise,
			job_description_exclude: excludeNoise,
			job_location_ids: params.locationIds,
			job_age_in_days: minAgeDays,
			industries: params.industries,
			offset: params.page ?? 0,
		},
	});
	return data;
}
