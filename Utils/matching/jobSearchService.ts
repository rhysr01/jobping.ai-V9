import type { PostgrestResponse, SupabaseClient } from "@supabase/supabase-js";

import { apiLogger } from "@/lib/api-logger";
import type { Database } from "@/lib/database.types";
import {
	CITY_NORMALIZATION_MAP,
	normalizeCity,
} from "@/lib/locationNormalizer";
import { getDatabaseCategoriesForForm } from "@/Utils/matching/categoryMapper";
import type { UserPreferences } from "@/Utils/matching/types";

type JobRow = Database["public"]["Tables"]["jobs"]["Row"];

export interface FetchJobsResult {
	jobs: JobRow[];
	filters: {
		cityCount: number;
		categoryCount: number;
	};
}

export class JobFetchError extends Error {
	constructor(
		message: string,
		public readonly details?: unknown,
	) {
		super(message);
		this.name = "JobFetchError";
	}
}

export async function fetchCandidateJobs(
	supabase: SupabaseClient<Database>,
	jobCap: number,
	users: Array<{ preferences: UserPreferences }>,
): Promise<FetchJobsResult> {
	apiLogger.info("Using optimized database filtering for job search");

	const allCities = new Set<string>();
	const allCareerPaths = new Set<string>();

	users.forEach((user) => {
		user.preferences.target_cities?.forEach((city) => {
			allCities.add(city);
		});
		if (user.preferences.career_path) {
			user.preferences.career_path.forEach((path) => {
				const dbCategories = getDatabaseCategoriesForForm(path);
				dbCategories.forEach((cat) => {
					allCareerPaths.add(cat);
				});
			});
		}
	});

	let query = supabase
		.from("jobs")
		.select(
			"job_hash, title, company, location, description, source, created_at, original_posted_date, last_seen_at, status, job_url, is_active, is_graduate, is_internship, categories, city, country, skills, work_environment, experience_required, language_requirements, visa_friendly",
		)
		.eq("is_active", true);

	// CRITICAL FIX: Build comprehensive city variations array using normalization map
	// This ensures we match ALL variations for ALL form cities (not just hardcoded ones)
	// Uses CITY_NORMALIZATION_MAP to find all variations that map to each target city
	if (allCities.size > 0 && allCities.size <= 50) {
		const cityVariations = new Set<string>();

		// Helper: Add a city name with all case variations
		const addCityWithCases = (cityName: string) => {
			cityVariations.add(cityName);
			cityVariations.add(cityName.toLowerCase());
			cityVariations.add(cityName.toUpperCase());
			cityVariations.add(
				cityName.charAt(0).toUpperCase() + cityName.slice(1).toLowerCase(),
			);
		};

		allCities.forEach((targetCity) => {
			// Normalize the target city first (handles any input variations)
			const normalizedTarget = normalizeCity(targetCity);
			if (!normalizedTarget) return;

			// Add the normalized target city with all case variations
			addCityWithCases(normalizedTarget);

			// Reverse lookup: Find all variations in CITY_NORMALIZATION_MAP that map TO this city
			// This finds all database variations (e.g., "Wien", "wien", "WIEN" all map to "Vienna")
			const targetLower = normalizedTarget.toLowerCase();
			Object.entries(CITY_NORMALIZATION_MAP).forEach(
				([variation, canonical]) => {
					if (canonical.toLowerCase() === targetLower) {
						// Add the variation itself and all its case forms
						addCityWithCases(variation);
					}
				},
			);

			// Also add common district/suburb patterns for major cities
			// These patterns are common in job postings
			const districtPatterns: Record<string, string[]> = {
				Amsterdam: [
					"Amsterdam Centrum",
					"Amsterdam Noord",
					"Amsterdam Oost",
					"Amsterdam Zuid",
					"Amsterdam-zuidoost",
					"Amsterdam Westpoort",
				],
				London: [
					"Central London",
					"City Of London",
					"East London",
					"North London",
					"South London",
					"West London",
					"Greater London",
					"North West London",
					"South East London",
					"South West London",
				],
				Berlin: ["Berlin-friedrichshain", "Berlin-kreuzberg", "Berlin-mitte"],
				Paris: [
					"Paris 1",
					"Paris 2",
					"Paris 3",
					"Paris 4",
					"Paris 5",
					"Paris 6",
					"Paris 7",
					"Paris 8",
					"Paris 9",
					"Paris 10",
					"Paris 8e",
				],
				Dublin: [
					"Dublin 1",
					"Dublin 2",
					"Dublin 3",
					"Dublin 4",
					"Dublin 5",
					"Dublin 6",
					"Dublin 7",
					"Dublin 8",
					"Dublin 9",
					"Dublin 10",
					"Dublin 11",
					"Dublin 12",
					"Dublin 13",
					"Dublin 14",
					"Dublin 07",
				],
				Prague: [
					"Praha 1",
					"Praha 2",
					"Praha 4",
					"Praha 5",
					"Praha 7",
					"Praha 8",
					"Praha 10",
				],
				Brussels: [
					"Bruxelles",
					"Bruxelles Ixelles",
					"Bruxelles Saint-gilles",
					"Bruxelles Schaarbeek",
				],
				Stockholm: ["Solna", "Järfälla", "Johanneshov", "Kista", "Sollentuna"],
				Copenhagen: [
					"Frederiksberg",
					"Bagsværd",
					"Birkerød",
					"Brøndby",
					"Gladsaxe",
					"Herlev",
					"Hørsholm",
					"Humlebæk",
					"Ishøj",
					"Kastrup",
					"Lynge",
					"Måløv",
					"Roskilde",
					"Søborg",
					"Täby",
					"Vallensbæk",
				],
				Zurich: [
					"Zürich",
					"Opfikon",
					"Wallisellen",
					"Schlieren",
					"Dübendorf",
					"Dietikon",
					"Dielsdorf",
					"Niederglatt",
					"Rümlang",
					"Rüschlikon",
					"Rüti",
					"Urdorf",
					"Wädenswil",
					"Wetzikon",
					"Zollikon",
					"Affoltern am Albis",
					"Bülach",
					"Dällikon",
					"Herrliberg",
					"Kilchberg",
					"Männedorf",
					"Stäfa",
					"Winterthur",
				],
				Munich: [
					"München",
					"Garching bei München",
					"Flughafen München",
					"Garching",
					"Neufahrn bei Freising",
				],
				Hamburg: ["Hamburg-Altona", "Hamburg Harvestehude", "Hamburg-Harburg"],
				Madrid: [
					"Alcalá de Henares",
					"Alcobendas",
					"Pozuelo de Alarcón",
					"Tres Cantos",
					"Torrejón de Ardoz",
					"Las Rozas de Madrid",
					"La Moraleja",
					"Getafe",
					"Leganés",
					"Fuenlabrada",
				],
				Barcelona: [
					"L'Hospitalet de Llobregat",
					"El Prat de Llobregat",
					"Sant Cugat del Vallès",
					"Sant Boi de Llobregat",
					"Sant Joan Despí",
					"Parets del Vallès",
					"Montcada i Reixac",
					"Santa Perpètua de Mogoda",
					"Polinyà",
					"Viladecans",
					"Viladecavalls",
				],
				Warsaw: ["Warszawa", "Nowy Dwor Mazowiecki"],
				Vienna: ["Wien", "Wiener Neudorf"],
				Milan: ["Milano"],
				Rome: ["Roma"],
				Manchester: ["Greater Manchester", "Manchester Area"],
				Birmingham: ["Greater Birmingham", "Birmingham Area", "West Midlands"],
				Belfast: [
					"Greater Belfast",
					"Belfast Area",
					"Northern Ireland",
					"Belfast City",
				],
			};

			if (districtPatterns[normalizedTarget]) {
				districtPatterns[normalizedTarget].forEach((pattern) => {
					addCityWithCases(pattern);
				});
			}
		});

		const citiesArray = Array.from(cityVariations);
		// Use .in() with all variations - this catches jobs with any variation of the city name
		query = query.in("city", citiesArray);
		apiLogger.debug(
			`Filtering by ${allCities.size} cities with ${citiesArray.length} variations at DB level`,
			{
				originalCities: Array.from(allCities).slice(0, 5),
				variationCount: citiesArray.length,
				sampleVariations: citiesArray.slice(0, 15),
				note: "Uses CITY_NORMALIZATION_MAP for comprehensive coverage of all form cities",
			},
		);
	}

	if (allCareerPaths.size > 0 && allCareerPaths.size <= 20) {
		const categoriesArray = Array.from(allCareerPaths);
		query = query.overlaps("categories", categoriesArray);
		apiLogger.debug(
			`Filtering by ${categoriesArray.length} categories at DB level`,
			{
				categories: categoriesArray.slice(0, 5),
			},
		);
	}

	query = query.order("created_at", { ascending: false }).limit(jobCap);

	const { data, error } = (await query) as PostgrestResponse<JobRow>;

	if (error) {
		apiLogger.error("Failed to fetch jobs", error as Error, {
			jobCap,
			userCount: users.length,
		});
		throw new JobFetchError("Failed to fetch jobs", error);
	}

	const jobs = data || [];

	apiLogger.info(
		`Fetched ${jobs.length} jobs using optimized database filtering`,
		{
			citiesFiltered: allCities.size,
			categoriesFiltered: allCareerPaths.size,
			jobsReturned: jobs.length,
		},
	);

	return {
		jobs,
		filters: {
			cityCount: allCities.size,
			categoryCount: allCareerPaths.size,
		},
	};
}
