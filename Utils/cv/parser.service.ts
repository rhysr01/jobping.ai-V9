/**
 * CV Parser Service - Extract WOW factor data from user CVs
 * Uses GPT-4o-mini for cheap, fast parsing
 */

import OpenAI from "openai";

export interface CVData {
	// Core identity
	name: string | null;
	email: string | null;

	// Experience
	total_years_experience: number | null;
	current_role: string | null;
	current_company: string | null;
	previous_companies: string[];

	// Skills & Tech
	technical_skills: string[];
	soft_skills: string[];
	languages: string[];

	// Education
	university: string | null;
	degree: string | null;
	graduation_year: number | null;

	// Projects
	notable_projects: Array<{
		name: string;
		description: string;
		technologies: string[];
	}>;

	// Career signals
	is_currently_employed: boolean;
	career_level: "entry" | "junior" | "mid" | "senior" | "lead";
	career_trajectory: "upward" | "lateral" | "transitioning" | "unclear";

	// WOW insights
	unique_strengths: string[];
	career_highlights: string[];
}

export class CVParserService {
	private openai: OpenAI;

	constructor() {
		this.openai = new OpenAI({
			apiKey: process.env.OPENAI_API_KEY!,
		});
	}

	/**
	 * Parse CV from URL or text
	 */
	async parseCV(cvUrl: string, userEmail: string): Promise<CVData | null> {
		try {
			console.log(` Parsing CV for ${userEmail} from ${cvUrl}`);

			// Fetch CV content
			const cvText = await this.fetchCVContent(cvUrl);
			if (!cvText) {
				console.warn("Failed to fetch CV content");
				return null;
			}

			// Parse with GPT-4o-mini (cheap + fast)
			const cvData = await this.parseWithAI(cvText);

			console.log(` CV parsed successfully for ${userEmail}`);
			return cvData;
		} catch (error) {
			console.error("CV parsing failed:", error);
			return null;
		}
	}

	/**
	 * Fetch CV content from URL
	 */
	private async fetchCVContent(cvUrl: string): Promise<string | null> {
		try {
			// If it's a PDF URL, we need to extract text
			if (cvUrl.endsWith(".pdf")) {
				// For now, return placeholder
				// NOTE: PDF parsing not yet implemented - requires pdf-parse library
				console.warn("PDF parsing not yet implemented");
				return null;
			}

			// If it's a text file or accessible URL
			const response = await fetch(cvUrl);
			if (!response.ok) {
				throw new Error(`Failed to fetch CV: ${response.status}`);
			}

			return await response.text();
		} catch (error) {
			console.error("Failed to fetch CV:", error);
			return null;
		}
	}

	/**
	 * Parse CV text with GPT-4o-mini
	 */
	private async parseWithAI(cvText: string): Promise<CVData> {
		const prompt = `
Extract structured data from this CV/resume. Return ONLY valid JSON.

CV TEXT:
${cvText.substring(0, 4000)}  // Limit to 4K chars

Return JSON with this structure:
{
  "name": "Full Name",
  "email": "email@example.com",
  "total_years_experience": 3,
  "current_role": "Frontend Developer",
  "current_company": "Spotify",
  "previous_companies": ["Google", "Meta"],
  "technical_skills": ["React", "TypeScript", "Node.js"],
  "soft_skills": ["Leadership", "Communication"],
  "languages": ["English", "German"],
  "university": "Trinity College Dublin",
  "degree": "Computer Science",
  "graduation_year": 2022,
  "notable_projects": [
    {
      "name": "E-commerce Platform",
      "description": "Built scalable React app",
      "technologies": ["React", "Node.js", "PostgreSQL"]
    }
  ],
  "is_currently_employed": true,
  "career_level": "junior",
  "career_trajectory": "upward",
  "unique_strengths": [
    "Full-stack expertise",
    "Startup experience",
    "Open source contributor"
  ],
  "career_highlights": [
    "Shipped product to 1M users",
    "Led team of 3 developers",
    "Won hackathon"
  ]
}

Rules:
- Extract ONLY what's in the CV (no assumptions)
- If info missing, use null
- For career_level: entry (<1yr), junior (1-3yr), mid (3-6yr), senior (6+yr)
- For career_trajectory: analyze job progression
- unique_strengths: 3 things that make them stand out
- career_highlights: 2-3 impressive achievements

Return ONLY the JSON, no other text.
`;

		const response = await this.openai.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [
				{
					role: "system",
					content:
						"You are a CV parser. Extract structured data and return ONLY valid JSON.",
				},
				{
					role: "user",
					content: prompt,
				},
			],
			temperature: 0.1, // Low temp for consistent parsing
			max_tokens: 1500,
		});

		const content = response.choices[0]?.message?.content || "{}";
		const cleanedContent = content
			.replace(/```json\n?/g, "")
			.replace(/```\n?/g, "")
			.trim();

		return JSON.parse(cleanedContent);
	}

	/**
	 * Generate WOW insights from CV data
	 */
	generateWOWInsights(cvData: CVData): string[] {
		const insights: string[] = [];

		// Years of experience
		if (cvData.total_years_experience) {
			if (cvData.total_years_experience >= 5) {
				insights.push(
					`${cvData.total_years_experience} years experience (you're in high demand)`,
				);
			} else if (cvData.total_years_experience >= 2) {
				insights.push(
					`${cvData.total_years_experience} years experience (perfect for mid-level roles)`,
				);
			}
		}

		// Big tech companies
		const bigTech = ["Google", "Meta", "Amazon", "Microsoft", "Apple"];
		const workedAtBigTech = cvData.previous_companies.filter((c) =>
			bigTech.some((bt) => c.toLowerCase().includes(bt.toLowerCase())),
		);
		if (workedAtBigTech.length > 0) {
			insights.push(`Ex-${workedAtBigTech[0]} (recruiters love this)`);
		}

		// Unique skill combos
		const hasFrontend = cvData.technical_skills.some((s) =>
			["react", "vue", "angular", "frontend"].some((k) =>
				s.toLowerCase().includes(k),
			),
		);
		const hasBackend = cvData.technical_skills.some((s) =>
			["node", "python", "java", "backend", "api"].some((k) =>
				s.toLowerCase().includes(k),
			),
		);
		if (hasFrontend && hasBackend) {
			insights.push("Full-stack (rare combo - high demand)");
		}

		// Recent grad
		const currentYear = new Date().getFullYear();
		if (cvData.graduation_year && currentYear - cvData.graduation_year <= 2) {
			insights.push("Recent grad (perfect for entry-level roles)");
		}

		// Unique strengths
		if (cvData.unique_strengths && cvData.unique_strengths.length > 0) {
			insights.push(...cvData.unique_strengths.slice(0, 2));
		}

		return insights;
	}
}

// Singleton instance
let parserInstance: CVParserService | null = null;

export function getCVParser(): CVParserService {
	if (!parserInstance) {
		parserInstance = new CVParserService();
	}
	return parserInstance;
}
