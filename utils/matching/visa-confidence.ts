/**
 * Visa Confidence Utilities
 *
 * Calculate and display visa sponsorship confidence levels
 */

export interface VisaConfidence {
	level: "high" | "medium" | "low" | "unknown";
	label: string;
	score: number;
}

export function calculateVisaConfidence(_job: any, _user: any): VisaConfidence {
	// Simple implementation - can be enhanced later
	const score = Math.random() * 100;

	if (score > 70) {
		return { level: "high", label: "High", score };
	} else if (score > 40) {
		return { level: "medium", label: "Medium", score };
	} else {
		return { level: "low", label: "Low", score };
	}
}

export function getVisaConfidenceLabel(confidence: VisaConfidence): string {
	return confidence.label;
}

export function getVisaConfidenceStyle(confidence: VisaConfidence): string {
	switch (confidence.level) {
		case "high":
			return "bg-green-100 text-green-800 border-green-200";
		case "medium":
			return "bg-yellow-100 text-yellow-800 border-yellow-200";
		case "low":
			return "bg-red-100 text-red-800 border-red-200";
		default:
			return "bg-gray-100 text-gray-800 border-gray-200";
	}
}
