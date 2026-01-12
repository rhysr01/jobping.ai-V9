import {
	englishSeeds,
	excludeNoise,
	localPacks,
	targetCities,
} from "../../lib/config";

describe("config", () => {
	describe("englishSeeds", () => {
		it("should have English job search terms", () => {
			expect(englishSeeds).toBeDefined();
			expect(Array.isArray(englishSeeds)).toBe(true);
			expect(englishSeeds.length).toBeGreaterThan(0);
		});

		it("should include early career terms", () => {
			expect(englishSeeds).toContain("graduate programme");
			expect(englishSeeds).toContain("entry level");
			expect(englishSeeds).toContain("intern");
		});
	});

	describe("localPacks", () => {
		it("should have language packs", () => {
			expect(localPacks).toBeDefined();
			expect(typeof localPacks).toBe("object");
		});

		it("should have packs for multiple languages", () => {
			expect(localPacks.es).toBeDefined();
			expect(localPacks.fr).toBeDefined();
			expect(localPacks.de).toBeDefined();
			expect(localPacks.it).toBeDefined();
		});

		it("should have arrays of terms for each language", () => {
			expect(Array.isArray(localPacks.es)).toBe(true);
			expect(Array.isArray(localPacks.fr)).toBe(true);
			expect(Array.isArray(localPacks.de)).toBe(true);
			expect(localPacks.es.length).toBeGreaterThan(0);
		});

		it("should have empty array for English", () => {
			expect(localPacks.en).toEqual([]);
		});
	});

	describe("excludeNoise", () => {
		it("should have exclusion terms", () => {
			expect(excludeNoise).toBeDefined();
			expect(Array.isArray(excludeNoise)).toBe(true);
			expect(excludeNoise.length).toBeGreaterThan(0);
		});

		it("should include senior level terms", () => {
			expect(
				excludeNoise.some((term) => term.toLowerCase().includes("senior")),
			).toBe(true);
			expect(
				excludeNoise.some((term) => term.toLowerCase().includes("lead")),
			).toBe(true);
		});
	});

	describe("targetCities", () => {
		it("should have target cities list", () => {
			expect(targetCities).toBeDefined();
			expect(Array.isArray(targetCities)).toBe(true);
			expect(targetCities.length).toBeGreaterThan(0);
		});

		it("should include major European cities", () => {
			expect(targetCities).toContain("London");
			expect(targetCities).toContain("Berlin");
			expect(targetCities).toContain("Paris");
			expect(targetCities).toContain("Madrid");
			expect(targetCities).toContain("Amsterdam");
		});

		it("should include all expected cities", () => {
			const expectedCities = [
				"London",
				"Madrid",
				"Berlin",
				"Hamburg",
				"Munich",
				"Amsterdam",
				"Brussels",
				"Paris",
				"Zurich",
				"Milan",
				"Rome",
				"Dublin",
			];
			expectedCities.forEach((city) => {
				expect(targetCities).toContain(city);
			});
		});
	});
});
