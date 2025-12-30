import { getBaseUrl } from "@/Utils/url-helpers";

interface StructuredDataProps {
	nonce?: string;
}

export default function StructuredData({ nonce }: StructuredDataProps) {
	const structuredData = {
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		name: "JobPing",
		description:
			"No logins. Zero scrolling. Jobs in your inbox. Weekly matches for early-career jobs across Europe.",
		url: getBaseUrl(),
		applicationCategory: "BusinessApplication",
		operatingSystem: "Web",
		offers: {
			"@type": "Offer",
			price: "0",
			priceCurrency: "EUR",
			description: "Free tier with 5 jobs per week",
		},
		featureList: [
			"AI-powered job matching",
			"weekly email delivery",
			"Early-career focused",
			"European job market",
			"No spam, unsubscribe anytime",
		],
		publisher: {
			"@type": "Organization",
			name: "JobPing",
			url: getBaseUrl(),
		},
	};

	return (
		<script
			type="application/ld+json"
			nonce={nonce}
			dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
		/>
	);
}
