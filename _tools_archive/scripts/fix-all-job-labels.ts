#!/usr/bin/env node

/**
 * Fix all existing jobs with proper labeling:
 * - Extract city/country from location
 * - Classify internship vs graduate
 * - Clean company names
 * - Set proper categories and flags
 */

import { existsSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const envPath = path.join(process.cwd(), ".env.local");
if (existsSync(envPath)) {
	dotenv.config({ path: envPath });
}

// Import after env is loaded
let getDatabaseClient: any;

// Parse location function
function parseLocation(location: string): { city: string; country: string } {
	if (!location) return { city: "", country: "" };
	const loc = location.toLowerCase().trim();

	const isRemote = /remote|work\s+from\s+home|wfh|anywhere/i.test(loc);
	if (isRemote) return { city: "", country: "" };

	const euCities = new Set([
		"dublin",
		"london",
		"paris",
		"amsterdam",
		"manchester",
		"birmingham",
		"madrid",
		"barcelona",
		"berlin",
		"hamburg",
		"munich",
		"zurich",
		"milan",
		"rome",
		"brussels",
		"stockholm",
		"copenhagen",
		"vienna",
		"prague",
		"warsaw",
	]);

	const parts = loc
		.split(",")
		.map((p) => p.trim())
		.filter(Boolean);
	let city = parts.length > 0 ? parts[0] : loc;
	let country = parts.length > 1 ? parts[parts.length - 1] : "";

	// Clean up city name
	city = city.replace(
		/\s+(eng|gb|de|fr|es|it|nl|be|ch|ie|se|dk|at|cz|pl)$/i,
		"",
	);

	if (parts.length === 1 && euCities.has(city)) {
		country = "";
	}

	// Normalize country codes
	if (country) {
		const countryMap: Record<string, string> = {
			eng: "GB",
			england: "GB",
			"united kingdom": "GB",
			uk: "GB",
			"great britain": "GB",
			de: "DE",
			germany: "DE",
			deutschland: "DE",
			fr: "FR",
			france: "FR",
			es: "ES",
			spain: "ES",
			españa: "ES",
			it: "IT",
			italy: "IT",
			italia: "IT",
			nl: "NL",
			netherlands: "NL",
			holland: "NL",
			be: "BE",
			belgium: "BE",
			belgië: "BE",
			belgique: "BE",
			ch: "CH",
			switzerland: "CH",
			schweiz: "CH",
			suisse: "CH",
			ie: "IE",
			ireland: "IE",
			éire: "IE",
			se: "SE",
			sweden: "SE",
			sverige: "SE",
			dk: "DK",
			denmark: "DK",
			danmark: "DK",
			at: "AT",
			austria: "AT",
			österreich: "AT",
			cz: "CZ",
			"czech republic": "CZ",
			czechia: "CZ",
			pl: "PL",
			poland: "PL",
			polska: "PL",
		};
		const normalizedCountry = country.toLowerCase();
		country = countryMap[normalizedCountry] || country.toUpperCase();
	}

	const capitalizedCity = city
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");

	return {
		city: capitalizedCity || city,
		country: country || "",
	};
}

// Classify job type
function classifyJobType(
	title: string,
	description: string,
): { isInternship: boolean; isGraduate: boolean } {
	const titleLower = (title || "").toLowerCase();
	const descLower = (description || "").toLowerCase();
	const _text = `${titleLower} ${descLower}`;

	const internshipTerms = [
		"intern",
		"internship",
		"stage",
		"praktikum",
		"prácticas",
		"tirocinio",
		"stagiaire",
		"stagiar",
		"becario",
		"werkstudent",
		"placement",
		"summer intern",
		"winter intern",
		"co-op",
		"coop",
	];

	const graduateTerms = [
		"graduate",
		"grad scheme",
		"grad program",
		"graduate programme",
		"graduate program",
		"graduate scheme",
		"graduate trainee",
		"management trainee",
		"trainee program",
		"trainee programme",
		"rotational program",
		"rotational programme",
		"campus hire",
		"new grad",
		"recent graduate",
	];

	const isInternship = internshipTerms.some(
		(term) => titleLower.includes(term) || descLower.includes(term),
	);

	const isGraduate =
		!isInternship &&
		graduateTerms.some(
			(term) => titleLower.includes(term) || descLower.includes(term),
		);

	return { isInternship, isGraduate };
}

// Clean company name
function cleanCompanyName(company: string): string {
	return (company || "").trim().replace(/\s+/g, " ");
}

// Detect work environment from location and description
function detectWorkEnvironment(location: string, description: string): string {
	const loc = (location || "").toLowerCase();
	const desc = (description || "").toLowerCase();
	const text = `${loc} ${desc}`;

	if (
		/remote|work\s+from\s+home|wfh|anywhere|fully\s+remote|100%\s+remote/i.test(
			text,
		)
	) {
		return "remote";
	}
	if (
		/hybrid|flexible|partially\s+remote|2-3\s+days|3\s+days\s+remote|mix\s+of\s+remote/i.test(
			text,
		)
	) {
		return "hybrid";
	}
	return "on-site";
}

// Extract language requirements (comprehensive - includes all visa-seeking languages)
function extractLanguageRequirements(description: string): string[] {
	if (!description) return [];
	const desc = description.toLowerCase();
	const languages: string[] = [];

	// Comprehensive language map - includes all visa-seeking languages
	const languageMap: Record<string, string> = {
		// EU languages
		english: "English",
		anglais: "English",
		"fluent in english": "English",
		"native english": "English",
		"english speaker": "English",
		"english speaking": "English",
		"english language": "English",
		"english proficiency": "English",
		french: "French",
		français: "French",
		francais: "French",
		"fluent in french": "French",
		"native french": "French",
		"french speaker": "French",
		"french speaking": "French",
		german: "German",
		deutsch: "German",
		"fluent in german": "German",
		"native german": "German",
		"german speaker": "German",
		"german speaking": "German",
		spanish: "Spanish",
		español: "Spanish",
		espanol: "Spanish",
		castellano: "Spanish",
		"fluent in spanish": "Spanish",
		"native spanish": "Spanish",
		"spanish speaker": "Spanish",
		"spanish speaking": "Spanish",
		italian: "Italian",
		italiano: "Italian",
		"fluent in italian": "Italian",
		"native italian": "Italian",
		"italian speaker": "Italian",
		"italian speaking": "Italian",
		dutch: "Dutch",
		nederlands: "Dutch",
		"fluent in dutch": "Dutch",
		"native dutch": "Dutch",
		"dutch speaker": "Dutch",
		"dutch speaking": "Dutch",
		portuguese: "Portuguese",
		português: "Portuguese",
		portugues: "Portuguese",
		"fluent in portuguese": "Portuguese",
		"native portuguese": "Portuguese",
		"portuguese speaker": "Portuguese",
		polish: "Polish",
		polski: "Polish",
		"fluent in polish": "Polish",
		"native polish": "Polish",
		"polish speaker": "Polish",
		"polish speaking": "Polish",
		swedish: "Swedish",
		svenska: "Swedish",
		"fluent in swedish": "Swedish",
		"native swedish": "Swedish",
		"swedish speaker": "Swedish",
		danish: "Danish",
		dansk: "Danish",
		"fluent in danish": "Danish",
		"native danish": "Danish",
		"danish speaker": "Danish",
		finnish: "Finnish",
		suomi: "Finnish",
		"fluent in finnish": "Finnish",
		"native finnish": "Finnish",
		"finnish speaker": "Finnish",
		czech: "Czech",
		čeština: "Czech",
		"fluent in czech": "Czech",
		"native czech": "Czech",
		"czech speaker": "Czech",
		romanian: "Romanian",
		română: "Romanian",
		romana: "Romanian",
		"fluent in romanian": "Romanian",
		"native romanian": "Romanian",
		"romanian speaker": "Romanian",
		hungarian: "Hungarian",
		magyar: "Hungarian",
		"fluent in hungarian": "Hungarian",
		"native hungarian": "Hungarian",
		"hungarian speaker": "Hungarian",
		greek: "Greek",
		ελληνικά: "Greek",
		"fluent in greek": "Greek",
		"native greek": "Greek",
		"greek speaker": "Greek",
		bulgarian: "Bulgarian",
		български: "Bulgarian",
		"fluent in bulgarian": "Bulgarian",
		"native bulgarian": "Bulgarian",
		"bulgarian speaker": "Bulgarian",
		croatian: "Croatian",
		hrvatski: "Croatian",
		"fluent in croatian": "Croatian",
		"native croatian": "Croatian",
		"croatian speaker": "Croatian",
		serbian: "Serbian",
		српски: "Serbian",
		"fluent in serbian": "Serbian",
		"native serbian": "Serbian",
		"serbian speaker": "Serbian",
		russian: "Russian",
		русский: "Russian",
		"fluent in russian": "Russian",
		"native russian": "Russian",
		"russian speaker": "Russian",
		"russian speaking": "Russian",
		ukrainian: "Ukrainian",
		українська: "Ukrainian",
		"fluent in ukrainian": "Ukrainian",
		"native ukrainian": "Ukrainian",
		"ukrainian speaker": "Ukrainian",
		// Middle Eastern & Central Asian
		arabic: "Arabic",
		العربية: "Arabic",
		"fluent in arabic": "Arabic",
		"native arabic": "Arabic",
		"arabic speaker": "Arabic",
		"arabic speaking": "Arabic",
		turkish: "Turkish",
		türkçe: "Turkish",
		turkce: "Turkish",
		"fluent in turkish": "Turkish",
		"native turkish": "Turkish",
		"turkish speaker": "Turkish",
		"turkish speaking": "Turkish",
		hebrew: "Hebrew",
		עברית: "Hebrew",
		"fluent in hebrew": "Hebrew",
		"native hebrew": "Hebrew",
		"hebrew speaker": "Hebrew",
		persian: "Persian",
		farsi: "Persian",
		فارسی: "Persian",
		"fluent in persian": "Persian",
		"fluent in farsi": "Persian",
		"native persian": "Persian",
		"native farsi": "Persian",
		"persian speaker": "Persian",
		"farsi speaker": "Persian",
		urdu: "Urdu",
		اردو: "Urdu",
		"fluent in urdu": "Urdu",
		"native urdu": "Urdu",
		"urdu speaker": "Urdu",
		// Asian languages
		japanese: "Japanese",
		日本語: "Japanese",
		nihongo: "Japanese",
		"fluent in japanese": "Japanese",
		"native japanese": "Japanese",
		"japanese speaker": "Japanese",
		"japanese speaking": "Japanese",
		"japanese language": "Japanese",
		"japanese proficiency": "Japanese",
		chinese: "Chinese",
		中文: "Chinese",
		mandarin: "Chinese",
		"fluent in chinese": "Chinese",
		"fluent in mandarin": "Chinese",
		"native chinese": "Chinese",
		"native mandarin": "Chinese",
		"chinese speaker": "Chinese",
		"mandarin speaker": "Chinese",
		"chinese speaking": "Chinese",
		"mandarin speaking": "Chinese",
		"chinese language": "Chinese",
		"mandarin language": "Chinese",
		"chinese proficiency": "Chinese",
		"mandarin proficiency": "Chinese",
		cantonese: "Cantonese",
		"fluent in cantonese": "Cantonese",
		"native cantonese": "Cantonese",
		"cantonese speaker": "Cantonese",
		"cantonese speaking": "Cantonese",
		korean: "Korean",
		한국어: "Korean",
		"fluent in korean": "Korean",
		"native korean": "Korean",
		"korean speaker": "Korean",
		"korean speaking": "Korean",
		"korean language": "Korean",
		"korean proficiency": "Korean",
		hindi: "Hindi",
		हिन्दी: "Hindi",
		"fluent in hindi": "Hindi",
		"native hindi": "Hindi",
		"hindi speaker": "Hindi",
		"hindi speaking": "Hindi",
		"hindi language": "Hindi",
		"hindi proficiency": "Hindi",
		thai: "Thai",
		ไทย: "Thai",
		"fluent in thai": "Thai",
		"native thai": "Thai",
		"thai speaker": "Thai",
		"thai speaking": "Thai",
		"thai language": "Thai",
		"thai proficiency": "Thai",
		vietnamese: "Vietnamese",
		"tiếng việt": "Vietnamese",
		"fluent in vietnamese": "Vietnamese",
		"native vietnamese": "Vietnamese",
		"vietnamese speaker": "Vietnamese",
		"vietnamese speaking": "Vietnamese",
		indonesian: "Indonesian",
		"bahasa indonesia": "Indonesian",
		"fluent in indonesian": "Indonesian",
		"native indonesian": "Indonesian",
		"indonesian speaker": "Indonesian",
		tagalog: "Tagalog",
		filipino: "Tagalog",
		"fluent in tagalog": "Tagalog",
		"fluent in filipino": "Tagalog",
		"native tagalog": "Tagalog",
		"native filipino": "Tagalog",
		"tagalog speaker": "Tagalog",
		"filipino speaker": "Tagalog",
		malay: "Malay",
		"bahasa melayu": "Malay",
		"fluent in malay": "Malay",
		"native malay": "Malay",
		"malay speaker": "Malay",
		bengali: "Bengali",
		বাংলা: "Bengali",
		"fluent in bengali": "Bengali",
		"native bengali": "Bengali",
		"bengali speaker": "Bengali",
		tamil: "Tamil",
		தமிழ்: "Tamil",
		"fluent in tamil": "Tamil",
		"native tamil": "Tamil",
		"tamil speaker": "Tamil",
		telugu: "Telugu",
		తెలుగు: "Telugu",
		"fluent in telugu": "Telugu",
		"native telugu": "Telugu",
		"telugu speaker": "Telugu",
	};

	for (const [keyword, lang] of Object.entries(languageMap)) {
		if (desc.includes(keyword) && !languages.includes(lang)) {
			languages.push(lang);
		}
	}

	// Remove duplicates and return
	return [...new Set(languages)];
}

async function fixAllJobs() {
	const module = await import("@/Utils/databasePool");
	getDatabaseClient = module.getDatabaseClient;
	const supabase = getDatabaseClient();

	console.log("🔍 Fetching all active jobs...");

	// Fetch ALL jobs in batches (no limit)
	let allJobs: any[] = [];
	let offset = 0;
	const pageSize = 1000;

	while (true) {
		const { data: jobs, error } = await supabase
			.from("jobs")
			.select(
				"id, title, company, location, city, country, description, categories, is_internship, is_graduate, is_early_career, experience_required, work_environment, language_requirements",
			)
			.eq("is_active", true)
			.range(offset, offset + pageSize - 1);

		if (error) {
			console.error("❌ Error fetching jobs:", error);
			break;
		}

		if (!jobs || jobs.length === 0) {
			break;
		}

		allJobs = allJobs.concat(jobs);
		console.log(`   Fetched ${allJobs.length} jobs...`);

		if (jobs.length < pageSize) {
			break;
		}

		offset += pageSize;
	}

	console.log(`\n📊 Processing ${allJobs.length} jobs...\n`);

	let updated = 0;
	let errors = 0;
	const batchSize = 100;

	for (let i = 0; i < allJobs.length; i += batchSize) {
		const batch = allJobs.slice(i, i + batchSize);

		for (const job of batch) {
			const updates: any = {};
			let needsUpdate = false;

			// Fix location
			if (
				job.location &&
				(!job.city || job.city === "" || !job.country || job.country === "")
			) {
				const { city, country } = parseLocation(job.location);
				if (city && (!job.city || job.city === "")) {
					updates.city = city;
					needsUpdate = true;
				}
				if (country && (!job.country || job.country === "")) {
					updates.country = country;
					needsUpdate = true;
				}
			}

			// Fix company name
			const cleanCompany = cleanCompanyName(job.company || "");
			if (cleanCompany !== job.company) {
				updates.company = cleanCompany;
				needsUpdate = true;
			}

			// Classify job type
			const { isInternship, isGraduate } = classifyJobType(
				job.title || "",
				job.description || "",
			);

			// Update is_internship flag
			if (job.is_internship !== isInternship) {
				updates.is_internship = isInternship;
				needsUpdate = true;
			}

			// Update is_graduate flag
			if (job.is_graduate !== isGraduate) {
				updates.is_graduate = isGraduate;
				needsUpdate = true;
			}

			// Set is_early_career flag (mutually exclusive: internship OR graduate OR early-career)
			// Maps to form: "Entry Level" (when NOT internship and NOT graduate)
			const isEarlyCareer = !isInternship && !isGraduate;
			if ((job as any).is_early_career !== isEarlyCareer) {
				updates.is_early_career = isEarlyCareer;
				needsUpdate = true;
			}

			// Ensure mutual exclusivity: if one is true, others must be false
			if (isInternship && (job.is_graduate || (job as any).is_early_career)) {
				updates.is_graduate = false;
				updates.is_early_career = false;
				needsUpdate = true;
			} else if (
				isGraduate &&
				(job.is_internship || (job as any).is_early_career)
			) {
				updates.is_internship = false;
				updates.is_early_career = false;
				needsUpdate = true;
			} else if (isEarlyCareer && (job.is_internship || job.is_graduate)) {
				updates.is_internship = false;
				updates.is_graduate = false;
				needsUpdate = true;
			}

			// Update categories
			const categories = Array.isArray(job.categories)
				? [...job.categories]
				: ["early-career"];
			if (!categories.includes("early-career")) {
				categories.push("early-career");
			}
			if (isInternship && !categories.includes("internship")) {
				categories.push("internship");
			}
			if (
				JSON.stringify(categories.sort()) !==
				JSON.stringify((job.categories || []).sort())
			) {
				updates.categories = categories;
				needsUpdate = true;
			}

			// Update experience_required
			const newExperience = isInternship
				? "internship"
				: isGraduate
					? "graduate"
					: "entry-level";
			if (job.experience_required !== newExperience) {
				updates.experience_required = newExperience;
				needsUpdate = true;
			}

			// Fix work environment
			const detectedWorkEnv = detectWorkEnvironment(
				job.location || "",
				job.description || "",
			);
			if (
				!job.work_environment ||
				job.work_environment === "on-site" ||
				job.work_environment !== detectedWorkEnv
			) {
				// Only update if it's missing or if current value is wrong (e.g., marked on-site but has remote indicators)
				if (
					!job.work_environment ||
					(job.work_environment === "on-site" && detectedWorkEnv !== "on-site")
				) {
					updates.work_environment = detectedWorkEnv;
					needsUpdate = true;
				}
			}

			// Extract and update language requirements
			const languages = extractLanguageRequirements(job.description || "");
			const currentLanguages = Array.isArray(job.language_requirements)
				? job.language_requirements
				: [];
			if (
				languages.length > 0 &&
				JSON.stringify(languages.sort()) !==
					JSON.stringify(currentLanguages.sort())
			) {
				updates.language_requirements = languages;
				needsUpdate = true;
			}

			if (needsUpdate) {
				updates.updated_at = new Date().toISOString();

				const { error } = await supabase
					.from("jobs")
					.update(updates)
					.eq("id", job.id);

				if (error) {
					console.error(`❌ Error updating job ${job.id}:`, error.message);
					errors++;
				} else {
					updated++;
				}
			}
		}

		console.log(
			`✅ Processed ${Math.min(i + batchSize, allJobs.length)}/${allJobs.length} jobs (${updated} updated, ${errors} errors)`,
		);
	}

	console.log("\n✅ Job labeling fix complete!");
	console.log(`   Total jobs processed: ${allJobs.length}`);
	console.log(`   Updated: ${updated} jobs`);
	console.log(`   Errors: ${errors} jobs`);
}

fixAllJobs()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error("❌ Fatal error:", error);
		process.exit(1);
	});
