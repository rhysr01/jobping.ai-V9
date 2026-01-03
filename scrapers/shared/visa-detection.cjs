/**
 * Visa Detection Filter
 * Detects visa sponsorship availability in job descriptions
 * IMPORTANT: Does NOT reject jobs - only labels them for filtering
 */

// Known sponsors (companies that regularly sponsor visas)
const KNOWN_SPONSORS = new Set([
	'google',
	'microsoft',
	'amazon',
	'meta',
	'apple',
	'deloitte',
	'pwc',
	'kpmg',
	'ey',
	'accenture',
	'mckinsey',
	'bcg',
	'bain',
	'goldman sachs',
	'jpmorgan',
	'morgan stanley',
	'stripe',
	'shopify',
	'atlassian',
	'salesforce',
	'palantir',
	'citadel',
	'jane street',
	'two sigma',
	'blackrock',
	'barclays',
	'hsbc',
	'ubs',
	'credit suisse',
	'deutsche bank',
	'bnp paribas',
	'societe generale',
	'ubs',
	'goldman sachs',
	'morgan stanley',
	'jpmorgan chase',
	'bank of america',
	'wells fargo',
	'citi',
	'visa',
	'mastercard',
	'american express',
	'paypal',
	'adobe',
	'oracle',
	'ibm',
	'intel',
	'nvidia',
	'netflix',
	'spotify',
	'uber',
	'lyft',
	'airbnb',
	'booking.com',
	'expedia',
	'linkedin',
	'twitter',
	'snapchat',
	'tiktok',
	'zoom',
	'slack',
	'notion',
	'figma',
	'canva',
	'robinhood',
	'coinbase',
	'binance',
	'okta',
	'crowdstrike',
	'zscaler',
	'palo alto networks',
	'fortinet',
	'check point',
	'splunk',
	'datadog',
	'new relic',
	'snowflake',
	'databricks',
	'confluent',
	'mongodb',
	'elastic',
	'redis',
	'cockroach labs',
	'hashicorp',
	'gitlab',
	'github',
	'gitlab',
	'circleci',
	'jenkins',
	'docker',
	'kubernetes',
	'red hat',
	'vmware',
	'citrix',
	'nutanix',
	'pure storage',
	'netapp',
	'emc',
	'dell technologies',
	'hp',
	'lenovo',
	'cisco',
	'juniper',
	'arista',
	'f5 networks',
	'akamai',
	'cloudflare',
	'fastly',
	'verisign',
	'godaddy',
	'namecheap',
	'bluehost',
	'siteground',
	'wp engine',
	'automattic',
	'wordpress',
	'squarespace',
	'wix',
	'shopify',
	'bigcommerce',
	'magento',
	'woocommerce',
	'prestashop',
	'opencart',
	'volusion',
	'3dcart',
	'sellfy',
	'gumroad',
	'teespring',
	'redbubble',
	'spreadshirt',
	'zazzle',
	'cafepress',
	'printful',
	'printify',
	'gelato',
	'printify',
	'printful',
	'teelaunch',
	'printaura',
	'printify',
	'gelato',
	'printful',
	'teelaunch',
	'printaura',
	'printify',
	'gelato',
	'printful',
	'teelaunch',
	'printaura',
]);

const VISA_KEYWORDS = [
	'visa sponsorship',
	'tier 2 sponsorship',
	'tier 2 visa',
	'blue card',
	'work permit',
	'sponsorship available',
	'will sponsor',
	'can sponsor',
	'eligible for sponsorship',
	'relocation support',
	'work authorization support',
	'international candidates',
	'global talent visa',
	'visa support',
	'immigration support',
	'work visa',
	'employment visa',
	'residence permit',
	'work authorization',
	'right to work',
	'sponsor visa',
	'visa assistance',
	'immigration assistance',
	'relocation package',
	'relocation assistance',
];

const NEGATIVE_KEYWORDS = [
	'no visa sponsorship',
	'must have right to work',
	'uk citizen only',
	'eu citizen only',
	'local candidates only',
	'must be authorized to work',
	'no sponsorship available',
	'no visa support',
	'no relocation',
	'local only',
	'citizens only',
	'no work permit',
	'no visa',
	'right to work required',
	'authorized to work required',
	'must have work authorization',
	'no international candidates',
];

/**
 * Detect visa friendliness from job description and company name
 * Returns: { visa_friendly: boolean|null, confidence: string, reason: string }
 * - visa_friendly: true = available, false = not available, null = unknown
 * - confidence: 'high' | 'medium' | 'low' | 'unknown'
 * - reason: explanation of the detection
 */
function detectVisaFriendliness(job) {
	const text = ((job.description || '') + ' ' + (job.title || '')).toLowerCase();
	const company = (job.company || job.company_name || '').toLowerCase().trim();

	// Check for negative indicators first (explicit rejection)
	const hasNegative = NEGATIVE_KEYWORDS.some((kw) => text.includes(kw));
	if (hasNegative) {
		return {
			visa_friendly: false,
			confidence: 'high',
			reason: 'explicit_rejection',
		};
	}

	// Check for positive keywords (explicit mention)
	const hasPositive = VISA_KEYWORDS.some((kw) => text.includes(kw));
	if (hasPositive) {
		return {
			visa_friendly: true,
			confidence: 'high',
			reason: 'explicit_mention',
		};
	}

	// Check if known sponsor (medium confidence)
	const isKnownSponsor = KNOWN_SPONSORS.has(company);
	if (isKnownSponsor) {
		return {
			visa_friendly: true,
			confidence: 'medium',
			reason: 'known_sponsor',
		};
	}

	// Default: unknown (does NOT reject the job)
	return {
		visa_friendly: null,
		confidence: 'unknown',
		reason: 'no_indicators',
	};
}

module.exports = { detectVisaFriendliness, KNOWN_SPONSORS, VISA_KEYWORDS, NEGATIVE_KEYWORDS };

