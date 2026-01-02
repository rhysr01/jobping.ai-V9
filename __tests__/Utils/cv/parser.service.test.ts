/**
 * Tests for CV Parser Service
 * Tests CV parsing and extraction
 */

import { CVParserService } from "@/Utils/cv/parser.service";

jest.mock("openai");

describe("CV Parser Service", () => {
	let service: CVParserService;
	let mockOpenAI: any;

	beforeEach(() => {
		jest.clearAllMocks();

		mockOpenAI = {
			chat: {
				completions: {
					create: jest.fn(),
				},
			},
		};

		const { OpenAI } = require("openai");
		OpenAI.mockImplementation(() => mockOpenAI);

		process.env.OPENAI_API_KEY = "test-key";
		service = new CVParserService();
	});

	describe("parseCV", () => {
		it("should parse CV text successfully", async () => {
			const cvText = "John Doe\nSoftware Engineer\n5 years experience";

			mockOpenAI.chat.completions.create.mockResolvedValue({
				choices: [
					{
						message: {
							content: JSON.stringify({
								name: "John Doe",
								experience: "5 years",
								skills: ["JavaScript", "TypeScript"],
							}),
						},
					},
				],
			});

			const result = await service.parseCV(cvText);

			expect(result).toBeDefined();
			expect(result.name).toBe("John Doe");
		});

		it("should handle parsing errors", async () => {
			mockOpenAI.chat.completions.create.mockRejectedValue(
				new Error("OpenAI error"),
			);

			await expect(service.parseCV("test cv")).rejects.toThrow();
		});

		it("should handle invalid JSON response", async () => {
			mockOpenAI.chat.completions.create.mockResolvedValue({
				choices: [
					{
						message: {
							content: "Invalid JSON",
						},
					},
				],
			});

			await expect(service.parseCV("test cv")).rejects.toThrow();
		});
	});

	describe("extractSkills", () => {
		it("should extract skills from CV", async () => {
			const cvText = "Skills: JavaScript, Python, React";

			mockOpenAI.chat.completions.create.mockResolvedValue({
				choices: [
					{
						message: {
							content: JSON.stringify({
								skills: ["JavaScript", "Python", "React"],
							}),
						},
					},
				],
			});

			const skills = await service.extractSkills(cvText);

			expect(skills).toContain("JavaScript");
			expect(skills).toContain("Python");
		});
	});
});
