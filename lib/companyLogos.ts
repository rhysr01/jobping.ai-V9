/**
 * Production-grade company logo mapping
 * Maps company names to their logo file paths
 * Only includes top 30 companies we've actually sent matches from
 */

export interface CompanyLogo {
  name: string;
  logoPath: string;
  domain?: string;
}

// Curated list of companies we've sent matches from
// Only includes companies with real logos (no placeholders)
export const COMPANY_LOGOS: CompanyLogo[] = [
  { name: 'Spotify', logoPath: '/logos/companies/spotify.svg', domain: 'spotify.com' },
  { name: 'Revolut', logoPath: '/logos/companies/revolut.svg', domain: 'revolut.com' },
  { name: 'Monzo', logoPath: '/logos/companies/monzo.svg', domain: 'monzo.com' },
  { name: 'N26', logoPath: '/logos/companies/n26.svg', domain: 'n26.com' },
  { name: 'Deliveroo', logoPath: '/logos/companies/deliveroo.svg', domain: 'deliveroo.co.uk' },
  { name: 'Google', logoPath: '/logos/companies/google.svg', domain: 'google.com' },
  { name: 'Meta', logoPath: '/logos/companies/meta.svg', domain: 'meta.com' },
  { name: 'Apple', logoPath: '/logos/companies/apple.svg', domain: 'apple.com' },
  { name: 'Stripe', logoPath: '/logos/companies/stripe.svg', domain: 'stripe.com' },
  { name: 'Notion', logoPath: '/logos/companies/notion.svg', domain: 'notion.so' },
  { name: 'Vercel', logoPath: '/logos/companies/vercel.svg', domain: 'vercel.com' },
  { name: 'GitHub', logoPath: '/logos/companies/github.svg', domain: 'github.com' },
  { name: 'Netflix', logoPath: '/logos/companies/netflix.svg', domain: 'netflix.com' },
  { name: 'Uber', logoPath: '/logos/companies/uber.svg', domain: 'uber.com' },
  { name: 'Airbnb', logoPath: '/logos/companies/airbnb.svg', domain: 'airbnb.com' },
  { name: 'Tesla', logoPath: '/logos/companies/tesla.svg', domain: 'tesla.com' },
  { name: 'Shopify', logoPath: '/logos/companies/shopify.svg', domain: 'shopify.com' },
  { name: 'Salesforce', logoPath: '/logos/companies/salesforce.svg', domain: 'salesforce.com' },
  { name: 'Accenture', logoPath: '/logos/companies/accenture.svg', domain: 'accenture.com' },
];

// Create a lookup map for fast access
const LOGO_MAP = new Map<string, CompanyLogo>();
COMPANY_LOGOS.forEach(company => {
  LOGO_MAP.set(company.name.toLowerCase().trim(), company);
  if (company.domain) {
    LOGO_MAP.set(company.domain.toLowerCase(), company);
  }
});

/**
 * Get logo for a company name
 * Returns undefined if logo not found (no fallback text)
 */
export function getCompanyLogo(companyName: string): CompanyLogo | undefined {
  if (!companyName) return undefined;
  
  const normalized = companyName.toLowerCase().trim();
  
  // Direct match
  if (LOGO_MAP.has(normalized)) {
    return LOGO_MAP.get(normalized);
  }
  
  // Try partial match (e.g., "Spotify Technology" -> "Spotify")
  for (const [key, logo] of LOGO_MAP.entries()) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return logo;
    }
  }
  
  return undefined;
}

/**
 * Get all companies with logos (for display)
 */
export function getAllCompanyLogos(): CompanyLogo[] {
  return COMPANY_LOGOS;
}

