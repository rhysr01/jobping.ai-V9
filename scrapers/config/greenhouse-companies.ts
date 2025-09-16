/**
 * Greenhouse company configuration
 * Extracted from the massive greenhouse-standardized.ts file
 */

// EU companies with proven job boards (expanded with Wave 2 EU employers)
export const GREENHOUSE_COMPANIES = [
  // Existing set
  'deloitte', 'pwc', 'ey', 'kpmg', 'accenture', 'capgemini',
  'bain', 'bcg', 'mckinsey', 'oliverwyman', 'rolandberger',
  'google', 'microsoft', 'amazon', 'meta', 'apple', 'netflix',
  'spotify', 'uber', 'airbnb', 'stripe', 'plaid', 'robinhood',
  'unilever', 'loreal', 'nestle', 'danone', 'heineken',
  'hsbc', 'barclays', 'deutschebank', 'bnpparibas', 'santander',

  // Wave 2 EU employers (slugs)
  'wise', 'checkoutcom', 'gocardless', 'onfido', 'cloudflare', 'thoughtmachine', 'snyk', 'palantir', 'improbable', 'globalwebindex',
  'workhuman', 'miro', 'udemy', 'zendesk',
  'hellofresh', 'deliveryhero', 'getyourguide', 'babbel', 'mambu', 'tiermobility', 'sennder', 'forto', 'solarisbank', 'raisin', 'coachhub', 'grover', 'getquin',
  'mollie', 'picnic', 'messagebird', 'backbase', 'bynder', 'bitvavo',
  'qonto', 'backmarket', 'contentsquare', 'payfit', 'alan', 'ledger', 'swile', 'vestiairecollective', 'mirakl', 'exotec', 'malt',
  'typeform', 'factorialhr', 'wallbox', 'redpoints', 'seedtag', 'carto', 'bankingcircle',
  'klarna', 'northvolt', 'epidemicsound', 'tink', 'voiscooters',
  'proton', 'scandit', 'nexthink', 'smallpdf',
  'personio', 'lilium', 'freeletics', 'demodesk',
  'bendingspoons', 'satispay',
  'toogoodtogo', 'pleo',
  'bitpanda', 'gostudent', 'adverity', 'collibra', 'showpad',
  'gitlab', 'remotecom', 'datadog', 'twilio', 'snowplow', 'thoughtworks', 'elastic', 'canonical',
  'n26', 'tradeledger', 'wefox', 'primer', 'saltpay', 'wayflyer', 'klaxoon', 'soldo', 'sumup',
  'deepl', 'graphcore', 'hazy', 'commercetools',
  // Wave 3 additions
  'bolt', 'transferwise', 'revolut', 'monzo', 'starling', 'tide',
  'octopus', 'bulb', 'ovo', 'pureplanet',
  'deliveroo', 'justeat', 'ubereats', 'glovo',
  'booking', 'expedia', 'airbnb', 'trivago',
  'zalando', 'asos', 'boohoo', 'h&m', 'zara', 'uniqlo'
];

// Company track mappings for filtering
export const COMPANY_TRACKS: Record<string, string[]> = {
  'google': ['tech', 'product'],
  'microsoft': ['tech', 'product'],
  'amazon': ['tech', 'product', 'operations'],
  'meta': ['tech', 'product'],
  'apple': ['tech', 'product'],
  'netflix': ['tech', 'product', 'content'],
  'spotify': ['tech', 'product', 'content'],
  'uber': ['tech', 'product', 'operations'],
  'airbnb': ['tech', 'product', 'operations'],
  'stripe': ['tech', 'finance'],
  'plaid': ['tech', 'finance'],
  'robinhood': ['tech', 'finance'],
  'deloitte': ['consulting', 'finance'],
  'pwc': ['consulting', 'finance'],
  'ey': ['consulting', 'finance'],
  'kpmg': ['consulting', 'finance'],
  'accenture': ['consulting', 'tech'],
  'capgemini': ['consulting', 'tech'],
  'bain': ['consulting'],
  'bcg': ['consulting'],
  'mckinsey': ['consulting'],
  'oliverwyman': ['consulting'],
  'rolandberger': ['consulting'],
  'unilever': ['marketing', 'operations'],
  'loreal': ['marketing', 'operations'],
  'nestle': ['marketing', 'operations'],
  'danone': ['marketing', 'operations'],
  'heineken': ['marketing', 'operations'],
  'hsbc': ['finance'],
  'barclays': ['finance'],
  'deutschebank': ['finance'],
  'bnpparibas': ['finance'],
  'santander': ['finance']
};

// Configuration constants
export const GREENHOUSE_CONFIG = {
  baseUrl: 'https://boards-api.greenhouse.io/v1/boards',
  seenJobTTL: 72 * 60 * 60 * 1000, // 72 hours
  rateLimitDelay: 100, // ms between requests
  maxRetries: 3,
  retryDelay: 1000, // ms
  batchSize: 5,
  batchDelay: 5000 // ms between batches
};
