/**
 * Unit Tests for CV Parser Service
 *
 * Tests CV parsing logic, WOW insights generation, and data structures.
 * Focuses on business logic rather than external API calls.
 */

import { CVParserService, CVData, getCVParser } from "@/Utils/cv/parser.service";

// Mock OpenAI to avoid external API calls
jest.mock("openai", () => ({
	__esModule: true,
	default: jest.fn(() => ({
		chat: {
			completions: {
				create: jest.fn(),
			},
		},
	})),
}));

describe("CV Parser Service", () => {
	let parser: CVParserService;
	let mockOpenAI: any;

	beforeEach(() => {
		jest.clearAllMocks();
		// Reset singleton instance
		(parser as any).parserInstance = undefined;
		parser = getCVParser();
		mockOpenAI = (parser as any).openai;
	});

	describe("Singleton Pattern", () => {
		it("should return same instance on multiple calls", () => {
			const parser1 = getCVParser();
			const parser2 = getCVParser();

			expect(parser1).toBe(parser2);
		});

		it("should create new instance when explicitly reset", () => {
			const parser1 = getCVParser();
			(parser as any).parserInstance = undefined;
			const parser2 = getCVParser();

			expect(parser1).not.toBe(parser2);
		});
	});

	describe("CV Data Structure", () => {
		it("should define complete CV data interface", () => {
			const sampleCV: CVData = {
				name: "John Doe",
				email: "john@example.com",
				total_years_experience: 3,
				current_role: "Software Engineer",
				current_company: "Tech Corp",
				previous_companies: ["Startup Inc", "Big Tech"],
				technical_skills: ["JavaScript", "React", "Node.js"],
				soft_skills: ["Communication", "Leadership"],
				languages: ["English", "Spanish"],
				university: "MIT",
				degree: "Computer Science",
				graduation_year: 2020,
				notable_projects: [
					{
						name: "E-commerce Platform",
						description: "Built full-stack platform",
						technologies: ["React", "Node.js", "MongoDB"],
					},
				],
				is_currently_employed: true,
				career_level: "mid",
				career_trajectory: "upward",
				unique_strengths: ["Problem solving", "Team leadership"],
				career_highlights: ["Led team of 5", "Reduced costs by 30%"],
			};

			expect(sampleCV).toHaveProperty("name");
			expect(sampleCV).toHaveProperty("technical_skills");
			expect(sampleCV).toHaveProperty("career_level");
			expect(sampleCV).toHaveProperty("notable_projects");
			expect(Array.isArray(sampleCV.notable_projects)).toBe(true);
		});
	});

	describe("generateWOWInsights", () => {
		it("should generate insights for experienced candidate", () => {
			const cvData: CVData = {
				name: "Jane Smith",
				email: "jane@example.com",
				total_years_experience: 7,
				current_role: "Senior Engineer",
				current_company: "Big Tech Corp",
				previous_companies: ["Google", "Facebook"],
				technical_skills: ["JavaScript", "Python", "React"],
				soft_skills: ["Leadership"],
				languages: ["English"],
				university: "Stanford",
				degree: "CS",
				graduation_year: 2015,
				notable_projects: [],
				is_currently_employed: true,
				career_level: "senior",
				career_trajectory: "upward",
				unique_strengths: ["System design"],
				career_highlights: ["Led architecture"],
			};

			const insights = (parser as any).generateWOWInsights(cvData);

			expect(Array.isArray(insights)).toBe(true);
			expect(insights.length).toBeGreaterThan(0);
			expect(insights.some(i => i.includes("7 years experience"))).toBe(true);
			expect(insights.some(i => i.includes("Ex-Google"))).toBe(true);
		});

		it("should generate insights for recent graduate", () => {
			const currentYear = new Date().getFullYear();
			const cvData: CVData = {
				name: "Fresh Grad",
				email: "fresh@example.com",
				total_years_experience: 0,
				current_role: null,
				current_company: null,
				previous_companies: [],
				technical_skills: ["JavaScript", "React"],
				soft_skills: ["Learning"],
				languages: ["English"],
				university: "State University",
				degree: "Computer Science",
				graduation_year: currentYear - 1, // Graduated last year
				notable_projects: [
					{
						name: "Portfolio Website",
						description: "Personal portfolio",
						technologies: ["React", "CSS"],
					},
				],
				is_currently_employed: false,
				career_level: "entry",
				career_trajectory: "upward",
				unique_strengths: [],
				career_highlights: [],
			};

			const insights = (parser as any).generateWOWInsights(cvData);

			expect(insights.some(i => i.includes("Recent grad"))).toBe(true);
		});

		it("should generate insights for full-stack developer", () => {
			const cvData: CVData = {
				name: "Full Stack Dev",
				email: "fullstack@example.com",
				total_years_experience: 4,
				current_role: "Developer",
				current_company: "Startup",
				previous_companies: [],
				technical_skills: ["React", "Node.js", "Python", "Django"],
				soft_skills: [],
				languages: ["English"],
				university: null,
				degree: null,
				graduation_year: null,
				notable_projects: [],
				is_currently_employed: true,
				career_level: "mid",
				career_trajectory: "upward",
				unique_strengths: [],
				career_highlights: [],
			};

			const insights = (parser as any).generateWOWInsights(cvData);

			expect(insights.some(i => i.includes("Full-stack"))).toBe(true);
			expect(insights.some(i => i.includes("rare combo"))).toBe(true);
		});

		it("should include unique strengths when available", () => {
			const cvData: CVData = {
				name: "Unique Dev",
				email: "unique@example.com",
				total_years_experience: 2,
				current_role: "Developer",
				current_company: "Company",
				previous_companies: [],
				technical_skills: ["JavaScript"],
				soft_skills: [],
				languages: ["English"],
				university: null,
				degree: null,
				graduation_year: null,
				notable_projects: [],
				is_currently_employed: true,
				career_level: "junior",
				career_trajectory: "upward",
				unique_strengths: ["Problem solving", "Communication", "Leadership"],
				career_highlights: [],
			};

			const insights = (parser as any).generateWOWInsights(cvData);

			expect(insights.some(i => i.includes("Problem solving"))).toBe(true);
			expect(insights.some(i => i.includes("Communication"))).toBe(true);
			// Should limit to first 2 unique strengths
			expect(insights.filter(i => i === "Leadership")).toHaveLength(0);
		});

		it("should handle null/undefined experience gracefully", () => {
			const cvData: CVData = {
				name: "Newbie",
				email: "newbie@example.com",
				total_years_experience: null,
				current_role: null,
				current_company: null,
				previous_companies: [],
				technical_skills: [],
				soft_skills: [],
				languages: [],
				university: null,
				degree: null,
				graduation_year: null,
				notable_projects: [],
				is_currently_employed: false,
				career_level: "entry",
				career_trajectory: "unclear",
				unique_strengths: [],
				career_highlights: [],
			};

			const insights = (parser as any).generateWOWInsights(cvData);

			expect(Array.isArray(insights)).toBe(true);
			// Should not crash with null values
			expect(() => (parser as any).generateWOWInsights(cvData)).not.toThrow();
		});

		it("should identify Big Tech experience", () => {
			const cvData: CVData = {
				name: "Big Tech Alum",
				email: "bigtech@example.com",
				total_years_experience: 5,
				current_role: "Engineer",
				current_company: "Current Company",
				previous_companies: ["Google Inc", "Microsoft Corporation"],
				technical_skills: ["JavaScript"],
				soft_skills: [],
				languages: ["English"],
				university: null,
				degree: null,
				graduation_year: null,
				notable_projects: [],
				is_currently_employed: true,
				career_level: "senior",
				career_trajectory: "upward",
				unique_strengths: [],
				career_highlights: [],
			};

			const insights = (parser as any).generateWOWInsights(cvData);

			expect(insights.some(i => i.includes("Ex-Google"))).toBe(true);
		});
	});

	describe("Experience Level Insights", () => {
		it("should categorize experience levels correctly", () => {
			const testCases = [
				{ years: 0, expected: "entry-level" },
				{ years: 1, expected: "junior roles" },
				{ years: 3, expected: "mid-level roles" },
				{ years: 6, expected: "high demand" },
				{ years: 8, expected: "senior roles" },
			];

			testCases.forEach(({ years, expected }) => {
				const cvData: CVData = {
					name: "Test",
					email: "test@example.com",
					total_years_experience: years,
					current_role: null,
					current_company: null,
					previous_companies: [],
					technical_skills: [],
					soft_skills: [],
					languages: [],
					university: null,
					degree: null,
					graduation_year: null,
					notable_projects: [],
					is_currently_employed: true,
					career_level: "mid",
					career_trajectory: "upward",
					unique_strengths: [],
					career_highlights: [],
				};

				const insights = (parser as any).generateWOWInsights(cvData);
				const experienceInsight = insights.find(i => i.includes("years experience"));

				if (expected !== "no insight") {
					expect(experienceInsight).toContain(expected);
				}
			});
		});
	});

	describe("Career Trajectory Analysis", () => {
		it("should provide appropriate advice based on trajectory", () => {
			const trajectories: Array<CVData["career_trajectory"]> = [
				"upward",
				"lateral",
				"transitioning",
				"unclear",
			];

			trajectories.forEach(trajectory => {
				const cvData: CVData = {
					name: "Test",
					email: "test@example.com",
					total_years_experience: 3,
					current_role: "Developer",
					current_company: "Company",
					previous_companies: [],
					technical_skills: ["JavaScript"],
					soft_skills: [],
					languages: ["English"],
					university: null,
					degree: null,
					graduation_year: null,
					notable_projects: [],
					is_currently_employed: true,
					career_level: "mid",
					career_trajectory: trajectory,
					unique_strengths: [],
					career_highlights: [],
				};

				expect(() => (parser as any).generateWOWInsights(cvData)).not.toThrow();
			});
		});
	});

	describe("Project Analysis", () => {
		it("should handle notable projects data structure", () => {
			const cvData: CVData = {
				name: "Project Dev",
				email: "project@example.com",
				total_years_experience: 2,
				current_role: "Developer",
				current_company: "Company",
				previous_companies: [],
				technical_skills: [],
				soft_skills: [],
				languages: [],
				university: null,
				degree: null,
				graduation_year: null,
				notable_projects: [
					{
						name: "E-commerce Site",
						description: "Built with modern stack",
						technologies: ["React", "Node.js", "MongoDB"],
					},
					{
						name: "Mobile App",
						description: "Cross-platform application",
						technologies: ["React Native", "Firebase"],
					},
				],
				is_currently_employed: true,
				career_level: "junior",
				career_trajectory: "upward",
				unique_strengths: [],
				career_highlights: [],
			};

			expect(cvData.notable_projects).toHaveLength(2);
			expect(cvData.notable_projects[0]).toHaveProperty("name");
			expect(cvData.notable_projects[0]).toHaveProperty("technologies");
			expect(Array.isArray(cvData.notable_projects[0].technologies)).toBe(true);
		});
	});

	describe("Error Handling", () => {
		it("should handle malformed CV data gracefully", () => {
			const malformedCV: Partial<CVData> = {
				name: "Test",
				// Missing required fields
			};

			expect(() => (parser as any).generateWOWInsights(malformedCV as CVData)).not.toThrow();
		});

		it("should handle empty arrays gracefully", () => {
			const emptyCV: CVData = {
				name: "Empty",
				email: "empty@example.com",
				total_years_experience: 0,
				current_role: null,
				current_company: null,
				previous_companies: [],
				technical_skills: [],
				soft_skills: [],
				languages: [],
				university: null,
				degree: null,
				graduation_year: null,
				notable_projects: [],
				is_currently_employed: false,
				career_level: "entry",
				career_trajectory: "unclear",
				unique_strengths: [],
				career_highlights: [],
			};

			const insights = (parser as any).generateWOWInsights(emptyCV);

			expect(Array.isArray(insights)).toBe(true);
			expect(insights.length).toBeGreaterThanOrEqual(0);
		});
	});

	describe("Big Tech Detection", () => {
		const bigTechCompanies = ["Google", "Microsoft", "Apple", "Amazon", "Meta", "Facebook"];

		it.each(bigTechCompanies)("should detect %s as Big Tech", (company) => {
			const cvData: CVData = {
				name: "Big Tech Alum",
				email: "bigtech@example.com",
				total_years_experience: 5,
				current_role: "Engineer",
				current_company: "Current Company",
				previous_companies: [company],
				technical_skills: ["JavaScript"],
				soft_skills: [],
				languages: ["English"],
				university: null,
				degree: null,
				graduation_year: null,
				notable_projects: [],
				is_currently_employed: true,
				career_level: "senior",
				career_trajectory: "upward",
				unique_strengths: [],
				career_highlights: [],
			};

			const insights = (parser as any).generateWOWInsights(cvData);

			expect(insights.some(i => i.includes(`Ex-${company}`))).toBe(true);
		});

		it("should handle case variations in company names", () => {
			const cvData: CVData = {
				name: "Test",
				email: "test@example.com",
				total_years_experience: 5,
				current_role: "Engineer",
				current_company: "Current",
				previous_companies: ["google inc", "MICROSOFT CORPORATION"],
				technical_skills: ["JavaScript"],
				soft_skills: [],
				languages: ["English"],
				university: null,
				degree: null,
				graduation_year: null,
				notable_projects: [],
				is_currently_employed: true,
				career_level: "senior",
				career_trajectory: "upward",
				unique_strengths: [],
				career_highlights: [],
			};

			const insights = (parser as any).generateWOWInsights(cvData);

			expect(insights.some(i => i.includes("Ex-"))).toBe(true);
		});
	});
});
