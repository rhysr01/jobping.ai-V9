import {
	COUNTRY_LANGUAGE_MAP,
	getCountryLanguage,
	getEarlyCareerTerms,
	hasEarlyCareerTerms,
	smartEarlyCareerDetection,
} from "@/Utils/countryLanguageMap";

describe("countryLanguageMap", () => {
	describe("getCountryLanguage", () => {
		it("should return correct language for country codes", () => {
			expect(getCountryLanguage("GB")).toBe("en");
			expect(getCountryLanguage("DE")).toBe("de");
			expect(getCountryLanguage("FR")).toBe("fr");
			expect(getCountryLanguage("ES")).toBe("es");
		});

		it("should return correct language for country names", () => {
			expect(getCountryLanguage("United Kingdom")).toBe("en");
			expect(getCountryLanguage("Germany")).toBe("de");
			expect(getCountryLanguage("France")).toBe("fr");
			expect(getCountryLanguage("Spain")).toBe("es");
		});

		it("should be case insensitive", () => {
			expect(getCountryLanguage("gb")).toBe("en");
			expect(getCountryLanguage("De")).toBe("de");
			expect(getCountryLanguage("FRANCE")).toBe("fr");
		});

		it('should return default "en" for unknown countries', () => {
			expect(getCountryLanguage("Unknown")).toBe("en");
			expect(getCountryLanguage("XX")).toBe("en");
		});

		it('should return default "en" for empty string', () => {
			expect(getCountryLanguage("")).toBe("en");
		});

		it("should trim whitespace", () => {
			expect(getCountryLanguage("  GB  ")).toBe("en");
			expect(getCountryLanguage("  Germany  ")).toBe("de");
		});

		it("should handle special cases", () => {
			expect(getCountryLanguage("Switzerland")).toBe("de");
			expect(getCountryLanguage("Belgium")).toBe("nl");
		});
	});

	describe("getEarlyCareerTerms", () => {
		it('should return English terms for "en"', () => {
			const terms = getEarlyCareerTerms("en");
			expect(terms).toContain("graduate");
			expect(terms).toContain("junior");
			expect(terms).toContain("entry level");
			expect(terms.length).toBeGreaterThan(0);
		});

		it('should return German terms for "de"', () => {
			const terms = getEarlyCareerTerms("de");
			expect(terms).toContain("praktikant");
			expect(terms).toContain("werkstudent");
			expect(terms.length).toBeGreaterThan(0);
		});

		it('should return French terms for "fr"', () => {
			const terms = getEarlyCareerTerms("fr");
			expect(terms).toContain("stagiaire");
			expect(terms).toContain("alternance");
			expect(terms.length).toBeGreaterThan(0);
		});

		it("should return default English terms for unknown language", () => {
			const terms = getEarlyCareerTerms("xx");
			expect(terms).toContain("graduate");
			expect(terms).toContain("junior");
		});

		it("should return terms for all supported languages", () => {
			const languages = [
				"en",
				"de",
				"fr",
				"es",
				"nl",
				"it",
				"pt",
				"sv",
				"da",
				"no",
			];
			languages.forEach((lang) => {
				const terms = getEarlyCareerTerms(lang);
				expect(terms.length).toBeGreaterThan(0);
			});
		});
	});

	describe("hasEarlyCareerTerms", () => {
		it("should detect English early career terms", () => {
			expect(hasEarlyCareerTerms("Looking for a graduate engineer", "en")).toBe(
				true,
			);
			expect(hasEarlyCareerTerms("Junior Developer position", "en")).toBe(true);
			expect(hasEarlyCareerTerms("Entry level opportunity", "en")).toBe(true);
			expect(hasEarlyCareerTerms("Internship available", "en")).toBe(true);
		});

		it("should detect German early career terms", () => {
			expect(hasEarlyCareerTerms("Wir suchen einen Praktikanten", "de")).toBe(
				true,
			);
			expect(hasEarlyCareerTerms("Werkstudent gesucht", "de")).toBe(true);
			expect(hasEarlyCareerTerms("Berufseinsteiger willkommen", "de")).toBe(
				true,
			);
		});

		it("should detect French early career terms", () => {
			expect(hasEarlyCareerTerms("Nous cherchons un stagiaire", "fr")).toBe(
				true,
			);
			expect(hasEarlyCareerTerms("Alternance disponible", "fr")).toBe(true);
			expect(hasEarlyCareerTerms("Jeune diplômé recherché", "fr")).toBe(true);
		});

		it("should be case insensitive", () => {
			expect(hasEarlyCareerTerms("GRADUATE POSITION", "en")).toBe(true);
			expect(hasEarlyCareerTerms("Junior Developer", "en")).toBe(true);
			expect(hasEarlyCareerTerms("PRAKTIKANT", "de")).toBe(true);
		});

		it("should return false when no terms found", () => {
			expect(
				hasEarlyCareerTerms("Senior developer with 10 years experience", "en"),
			).toBe(false);
			expect(hasEarlyCareerTerms("Experienced professional needed", "en")).toBe(
				false,
			);
		});

		it("should handle empty text", () => {
			expect(hasEarlyCareerTerms("", "en")).toBe(false);
		});
	});

	describe("smartEarlyCareerDetection", () => {
		it("should detect early career using country language", () => {
			const job = {
				title: "Praktikant gesucht",
				description: "Wir suchen einen Praktikanten",
				country: "Germany",
			};
			expect(smartEarlyCareerDetection(job)).toBe(true);
		});

		it("should fallback to English terms", () => {
			const job = {
				title: "Graduate Engineer",
				description: "Looking for a graduate",
				country: "Unknown",
			};
			expect(smartEarlyCareerDetection(job)).toBe(true);
		});

		it("should return false for senior positions", () => {
			const job = {
				title: "Senior Developer",
				description: "10+ years experience required",
				country: "United Kingdom",
			};
			expect(smartEarlyCareerDetection(job)).toBe(false);
		});

		it("should handle jobs without country", () => {
			const job = {
				title: "Graduate Position",
				description: "Entry level role",
				country: undefined,
			};
			expect(smartEarlyCareerDetection(job)).toBe(true);
		});

		it("should detect using language-specific terms", () => {
			const job = {
				title: "Stagiaire",
				description: "Alternance disponible",
				country: "France",
			};
			expect(smartEarlyCareerDetection(job)).toBe(true);
		});
	});

	describe("COUNTRY_LANGUAGE_MAP", () => {
		it("should have entries for common countries", () => {
			expect(COUNTRY_LANGUAGE_MAP["GB"]).toBe("en");
			expect(COUNTRY_LANGUAGE_MAP["Germany"]).toBe("de");
			expect(COUNTRY_LANGUAGE_MAP["France"]).toBe("fr");
		});

		it("should have case variations defined in map", () => {
			// Test that the function handles case variations, not the map itself
			expect(getCountryLanguage("gb")).toBe("en");
			expect(getCountryLanguage("Gb")).toBe("en");
			expect(getCountryLanguage("gB")).toBe("en");
			expect(getCountryLanguage("GERMANY")).toBe("de");
		});
	});
});
