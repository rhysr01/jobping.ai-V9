import {
	isJob,
	isTestOrPerfMode,
	mapCategories,
	normalizeCategoriesForRead,
	normalizeJobForMatching,
	normalizeToString,
	normalizeUser,
	normalizeUserPreferences,
	reqFirst,
	reqString,
	toOptString,
	toStringArray,
	toWorkEnv,
} from "@/utils/matching/normalizers";
import type { Job, UserPreferences } from "@/utils/matching/types";

describe("normalizers", () => {
	describe("toStringArray", () => {
		it("should return array as-is if valid", () => {
			expect(toStringArray(["a", "b", "c"])).toEqual(["a", "b", "c"]);
		});

		it("should filter out empty strings", () => {
			expect(toStringArray(["a", "", "b", "   ", "c"])).toEqual([
				"a",
				"b",
				"c",
			]);
		});

		it("should split pipe-separated string", () => {
			expect(toStringArray("a|b|c")).toEqual(["a", "b", "c"]);
		});

		it("should trim whitespace", () => {
			expect(toStringArray(" a | b | c ")).toEqual(["a", "b", "c"]);
		});

		it("should return fallback for empty string", () => {
			expect(toStringArray("", ["default"])).toEqual(["default"]);
		});

		it("should return fallback for non-string non-array", () => {
			expect(toStringArray(null, ["default"])).toEqual(["default"]);
			expect(toStringArray(123, ["default"])).toEqual(["default"]);
			expect(toStringArray({}, ["default"])).toEqual(["default"]);
		});

		it("should filter out non-string items", () => {
			expect(toStringArray(["a", 123, "b", null, "c"])).toEqual([
				"a",
				"b",
				"c",
			]);
		});
	});

	describe("toOptString", () => {
		it("should return string as-is", () => {
			expect(toOptString("test")).toBe("test");
		});

		it("should return string as-is without trimming", () => {
			expect(toOptString("  test  ")).toBe("  test  ");
		});

		it("should return null for empty string", () => {
			expect(toOptString("")).toBeNull();
		});

		it("should return null for whitespace-only string", () => {
			expect(toOptString("   ")).toBeNull();
		});

		it("should return null for non-string", () => {
			expect(toOptString(null)).toBeNull();
			expect(toOptString(123)).toBeNull();
			expect(toOptString({})).toBeNull();
		});
	});

	describe("toWorkEnv", () => {
		it('should normalize "onsite" to "on-site"', () => {
			expect(toWorkEnv("onsite")).toBe("on-site");
		});

		it('should normalize "office" to "on-site"', () => {
			expect(toWorkEnv("office")).toBe("on-site");
		});

		it('should normalize "hybrid"', () => {
			expect(toWorkEnv("hybrid")).toBe("hybrid");
		});

		it('should normalize "remote"', () => {
			expect(toWorkEnv("remote")).toBe("remote");
		});

		it("should be case insensitive", () => {
			expect(toWorkEnv("REMOTE")).toBe("remote");
			expect(toWorkEnv("Hybrid")).toBe("hybrid");
		});

		it("should return null for unknown values", () => {
			expect(toWorkEnv("unknown")).toBeNull();
			expect(toWorkEnv("")).toBeNull();
			expect(toWorkEnv(null)).toBeNull();
		});
	});

	describe("reqString", () => {
		it("should return string as-is", () => {
			expect(reqString("test")).toBe("test");
		});

		it("should return fallback for null", () => {
			expect(reqString(null, "default")).toBe("default");
		});

		it("should return fallback for undefined", () => {
			expect(reqString(undefined, "default")).toBe("default");
		});

		it("should return empty string by default", () => {
			expect(reqString(null)).toBe("");
		});
	});

	describe("reqFirst", () => {
		it("should return first element of array", () => {
			expect(reqFirst(["a", "b", "c"])).toBe("a");
		});

		it("should return fallback for empty array", () => {
			expect(reqFirst([], "default")).toBe("default");
		});

		it("should return fallback for null", () => {
			expect(reqFirst(null, "default")).toBe("default");
		});

		it("should handle pipe-separated string", () => {
			expect(reqFirst("a|b|c")).toBe("a");
		});
	});

	describe("normalizeCategoriesForRead", () => {
		it("should normalize categories array", () => {
			expect(normalizeCategoriesForRead(["a", "b"])).toEqual(["a", "b"]);
		});

		it("should handle string input", () => {
			expect(normalizeCategoriesForRead("a|b|c")).toEqual(["a", "b", "c"]);
		});
	});

	describe("mapCategories", () => {
		it("should map categories with function", () => {
			const result = mapCategories(["a", "b"], (c) => c.toUpperCase());
			expect(result).toEqual(["A", "B"]);
		});

		it("should handle empty array", () => {
			const result = mapCategories([], (c) => c.toUpperCase());
			expect(result).toEqual([]);
		});
	});

	describe("isJob", () => {
		it("should validate complete job object", () => {
			const job: Job = {
				job_hash: "test",
				title: "Test",
				company: "Test Co",
				job_url: "https://example.com",
				location: "London",
				description: "Test",
				categories: [],
				source: "test",
				is_active: true,
				is_graduate: false,
				is_internship: false,
			};
			expect(isJob(job)).toBe(true);
		});

		it("should reject object missing job_hash", () => {
			expect(
				isJob({
					title: "Test",
					company: "Test Co",
					job_url: "https://example.com",
				}),
			).toBe(false);
		});

		it("should reject object missing title", () => {
			expect(
				isJob({
					job_hash: "test",
					company: "Test Co",
					job_url: "https://example.com",
				}),
			).toBe(false);
		});

		it("should reject non-object", () => {
			expect(isJob(null)).toBe(false);
			expect(isJob("string")).toBe(false);
			expect(isJob(123)).toBe(false);
		});
	});

	describe("normalizeUser", () => {
		it("should normalize user data", () => {
			const user = {
				email: "test@example.com",
				career_path: ["tech"],
				target_cities: ["London"],
				languages_spoken: ["English"],
				company_types: ["startup"],
				roles_selected: ["engineer"],
				professional_expertise: "Software",
				entry_level_preference: "entry",
				work_environment: "remote",
				start_date: "2024-01-01",
			};
			const result = normalizeUser(user);
			expect(result.email).toBe("test@example.com");
			expect(result.career_path).toEqual(["tech"]);
			expect(result.work_environment).toBe("remote");
		});

		it("should handle missing fields", () => {
			const user = {
				email: "test@example.com",
			};
			const result = normalizeUser(user);
			expect(result.email).toBe("test@example.com");
			expect(result.career_path).toEqual([]);
		});
	});

	describe("normalizeUserPreferences", () => {
		it("should normalize user preferences", () => {
			const prefs: UserPreferences = {
				email: "test@example.com",
				career_path: ["tech"],
				target_cities: ["London"],
				languages_spoken: ["English"],
				company_types: ["startup"],
				roles_selected: ["engineer"],
				professional_expertise: "Software",
				entry_level_preference: "entry",
				work_environment: "remote",
				start_date: "2024-01-01",
			};
			const result = normalizeUserPreferences(prefs);
			expect(result.email).toBe("test@example.com");
			expect(result.career_path).toEqual(["tech"]);
			expect(result.work_environment).toBe("remote");
		});
	});

	describe("normalizeJobForMatching", () => {
		it("should normalize job data", () => {
			const job: Job = {
				job_hash: "test",
				title: "  Test Title  ",
				company: "  Test Co  ",
				location: "  London  ",
				description: "Test description",
				categories: ["tech"],
				job_url: "https://example.com",
				source: "test",
				is_active: true,
				is_graduate: false,
				is_internship: false,
			};
			const result = normalizeJobForMatching(job);
			expect(result.title).toBe("  Test Title  "); // reqString doesn't trim
			expect(result.categories).toEqual(["tech"]);
		});

		it("should ensure categories is array", () => {
			const job: Job = {
				job_hash: "test",
				title: "Test",
				company: "Test Co",
				location: "London",
				description: "Test",
				categories: undefined as any,
				job_url: "https://example.com",
				source: "test",
				is_active: true,
				is_graduate: false,
				is_internship: false,
			};
			const result = normalizeJobForMatching(job);
			expect(Array.isArray(result.categories)).toBe(true);
		});
	});

	describe("normalizeToString", () => {
		it("should return string as-is", () => {
			expect(normalizeToString("test")).toBe("test");
		});

		it("should join array with comma", () => {
			expect(normalizeToString(["a", "b", "c"])).toBe("a, b, c");
		});

		it("should stringify object", () => {
			expect(normalizeToString({ a: 1 })).toBe('{"a":1}');
		});

		it("should convert number to string", () => {
			expect(normalizeToString(123)).toBe("123");
		});

		it("should handle null/undefined", () => {
			expect(normalizeToString(null)).toBe("");
			expect(normalizeToString(undefined)).toBe("");
		});
	});

	describe("isTestOrPerfMode", () => {
		it("should detect test mode", () => {
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = "test";
			expect(isTestOrPerfMode()).toBe(true);
			process.env.NODE_ENV = originalEnv;
		});

		it("should detect perf mode flag", () => {
			const originalFlag = process.env.JOBPING_TEST_MODE;
			process.env.JOBPING_TEST_MODE = "1";
			expect(isTestOrPerfMode()).toBe(true);
			process.env.JOBPING_TEST_MODE = originalFlag;
		});
	});
});
