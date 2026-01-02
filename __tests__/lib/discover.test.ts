/**
 * Tests for Company Discovery
 * Tests company discovery parameter handling
 */

import type { DiscoverParams } from "@/lib/discover";

describe("Discover - Parameter Types", () => {
	it("should accept valid location IDs", () => {
		const params: DiscoverParams = {
			locationIds: [1, 2, 3],
			langs: ["en"],
		};

		expect(params.locationIds).toEqual([1, 2, 3]);
	});

	it("should accept multiple languages", () => {
		const params: DiscoverParams = {
			locationIds: [1],
			langs: ["en", "fr", "de"],
		};

		expect(params.langs).toEqual(["en", "fr", "de"]);
	});

	it("should accept optional industries", () => {
		const params: DiscoverParams = {
			locationIds: [1],
			langs: ["en"],
			industries: ["tech", "finance"],
		};

		expect(params.industries).toEqual(["tech", "finance"]);
	});

	it("should accept optional page parameter", () => {
		const params: DiscoverParams = {
			locationIds: [1],
			langs: ["en"],
			page: 5,
		};

		expect(params.page).toBe(5);
	});

	it("should work without optional parameters", () => {
		const params: DiscoverParams = {
			locationIds: [1],
			langs: ["en"],
		};

		expect(params.industries).toBeUndefined();
		expect(params.page).toBeUndefined();
	});

	it("should accept empty location array", () => {
		const params: DiscoverParams = {
			locationIds: [],
			langs: ["en"],
		};

		expect(params.locationIds).toEqual([]);
	});

	it("should accept all supported languages", () => {
		const params: DiscoverParams = {
			locationIds: [1],
			langs: ["en", "es", "fr", "de", "it"],
		};

		expect(params.langs).toHaveLength(5);
	});

	it("should accept single language", () => {
		const params: DiscoverParams = {
			locationIds: [1],
			langs: ["fr"],
		};

		expect(params.langs).toEqual(["fr"]);
	});

	it("should accept multiple location IDs", () => {
		const params: DiscoverParams = {
			locationIds: [100, 200, 300, 400],
			langs: ["en"],
		};

		expect(params.locationIds).toHaveLength(4);
	});

	it("should accept page 0 (first page)", () => {
		const params: DiscoverParams = {
			locationIds: [1],
			langs: ["en"],
			page: 0,
		};

		expect(params.page).toBe(0);
	});
});
