import {
	BUILT_FOR_STUDENTS_FEATURES,
	BUILT_FOR_STUDENTS_SUBTITLE,
	BUILT_FOR_STUDENTS_TITLE,
	CTA_FREE,
	CTA_PREMIUM,
	FREE_PLAN_FEATURES,
	FREE_PLAN_SUBTITLE,
	FREE_PLAN_TITLE,
	HERO_CTA,
	HERO_HEADLINE,
	HERO_SUBLINE,
	HERO_TITLE,
	HOW_IT_WORKS_STEPS,
	HOW_IT_WORKS_TITLE,
	PREMIUM_PLAN_ANNUAL,
	PREMIUM_PLAN_FEATURES,
	PREMIUM_PLAN_PRICE,
	PREMIUM_PLAN_PRICE_UNIT,
	PREMIUM_PLAN_SUBTITLE,
	PREMIUM_PLAN_TITLE,
	PRICING_BADGE,
	PRICING_SUBTITLE,
	PRICING_TITLE,
	REASSURANCE_ITEMS,
	VP_TAGLINE,
} from "@/lib/copy";

describe("copy", () => {
	describe("CTA constants", () => {
		it("should have free CTA", () => {
			expect(CTA_FREE).toBeDefined();
			expect(typeof CTA_FREE).toBe("string");
		});

		it("should have premium CTA", () => {
			expect(CTA_PREMIUM).toBeDefined();
			expect(typeof CTA_PREMIUM).toBe("string");
		});

		it("should have value proposition tagline", () => {
			expect(VP_TAGLINE).toBeDefined();
			expect(VP_TAGLINE).toContain("No logins");
		});
	});

	describe("Hero section", () => {
		it("should have hero title", () => {
			expect(HERO_TITLE).toBe("JobPing");
		});

		it("should have hero headline", () => {
			expect(HERO_HEADLINE).toBeDefined();
			expect(HERO_HEADLINE.length).toBeGreaterThan(0);
		});

		it("should have hero subline", () => {
			expect(HERO_SUBLINE).toBeDefined();
			expect(HERO_SUBLINE.length).toBeGreaterThan(0);
		});

		it("should have hero CTA", () => {
			expect(HERO_CTA).toBeDefined();
			expect(typeof HERO_CTA).toBe("string");
		});
	});

	describe("How it works", () => {
		it("should have how it works title", () => {
			expect(HOW_IT_WORKS_TITLE).toBeDefined();
		});

		it("should have step descriptions", () => {
			expect(HOW_IT_WORKS_STEPS).toBeDefined();
			expect(Array.isArray(HOW_IT_WORKS_STEPS)).toBe(true);
			expect(HOW_IT_WORKS_STEPS.length).toBeGreaterThan(0);
		});

		it("should have complete step information", () => {
			HOW_IT_WORKS_STEPS.forEach((step) => {
				expect(step).toHaveProperty("title");
				expect(step).toHaveProperty("description");
				expect(typeof step.title).toBe("string");
				expect(typeof step.description).toBe("string");
			});
		});
	});

	describe("Built for students", () => {
		it("should have title", () => {
			expect(BUILT_FOR_STUDENTS_TITLE).toBeDefined();
		});

		it("should have subtitle", () => {
			expect(BUILT_FOR_STUDENTS_SUBTITLE).toBeDefined();
		});

		it("should have features array", () => {
			expect(BUILT_FOR_STUDENTS_FEATURES).toBeDefined();
			expect(Array.isArray(BUILT_FOR_STUDENTS_FEATURES)).toBe(true);
			expect(BUILT_FOR_STUDENTS_FEATURES.length).toBeGreaterThan(0);
		});

		it("should have complete feature information", () => {
			BUILT_FOR_STUDENTS_FEATURES.forEach((feature) => {
				expect(feature).toHaveProperty("num");
				expect(feature).toHaveProperty("title");
				expect(feature).toHaveProperty("body");
			});
		});
	});

	describe("Pricing section", () => {
		it("should have pricing title", () => {
			expect(PRICING_TITLE).toBeDefined();
		});

		it("should have pricing subtitle", () => {
			expect(PRICING_SUBTITLE).toBeDefined();
		});

		it("should have pricing badge", () => {
			expect(PRICING_BADGE).toBeDefined();
		});
	});

	describe("Free plan", () => {
		it("should have free plan title", () => {
			expect(FREE_PLAN_TITLE).toBe("Free");
		});

		it("should have free plan subtitle", () => {
			expect(FREE_PLAN_SUBTITLE).toBeDefined();
		});

		it("should have free plan features", () => {
			expect(FREE_PLAN_FEATURES).toBeDefined();
			expect(Array.isArray(FREE_PLAN_FEATURES)).toBe(true);
			expect(FREE_PLAN_FEATURES.length).toBeGreaterThan(0);
		});
	});

	describe("Premium plan", () => {
		it("should have premium plan title", () => {
			expect(PREMIUM_PLAN_TITLE).toBe("Premium");
		});

		it("should have premium plan subtitle", () => {
			expect(PREMIUM_PLAN_SUBTITLE).toBeDefined();
		});

		it("should have premium plan price", () => {
			expect(PREMIUM_PLAN_PRICE).toBeDefined();
			expect(typeof PREMIUM_PLAN_PRICE).toBe("string");
		});

		it("should have premium plan features", () => {
			expect(PREMIUM_PLAN_FEATURES).toBeDefined();
			expect(Array.isArray(PREMIUM_PLAN_FEATURES)).toBe(true);
			expect(PREMIUM_PLAN_FEATURES.length).toBeGreaterThan(0);
		});
	});

	describe("Reassurance items", () => {
		it("should have reassurance items", () => {
			expect(REASSURANCE_ITEMS).toBeDefined();
			expect(Array.isArray(REASSURANCE_ITEMS)).toBe(true);
			expect(REASSURANCE_ITEMS.length).toBeGreaterThan(0);
		});

		it("should include key reassurance points", () => {
			const items = REASSURANCE_ITEMS.map((item) => item.toLowerCase());
			expect(
				items.some(
					(item) => item.includes("cv") || item.includes("cv required"),
				),
			).toBe(true);
			expect(items.some((item) => item.includes("unsubscribe"))).toBe(true);
		});
	});
});
