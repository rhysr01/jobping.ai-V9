/**
 * Synonym Packs for Enhanced Job Matching
 * Per-track (A-E) and city-specific synonym expansions
 */

export interface SynonymPack {
  track: string;
  synonyms: string[];
  city?: string;
}

// Track A: Technology & Software Development
export const TRACK_A_SYNONYMS: SynonymPack = {
  track: 'A',
  synonyms: [
    // Software Development
    'software engineer', 'developer', 'programmer', 'coder', 'software developer',
    'frontend developer', 'backend developer', 'full stack developer', 'full-stack developer',
    'web developer', 'mobile developer', 'ios developer', 'android developer',
    'react developer', 'vue developer', 'angular developer', 'node developer',
    'python developer', 'java developer', 'javascript developer', 'typescript developer',
    
    // Engineering
    'software engineer', 'systems engineer', 'platform engineer', 'devops engineer',
    'site reliability engineer', 'sre', 'cloud engineer', 'infrastructure engineer',
    'security engineer', 'qa engineer', 'test engineer', 'automation engineer',
    
    // Data & AI
    'data engineer', 'machine learning engineer', 'ml engineer', 'ai engineer',
    'data scientist', 'data analyst', 'business intelligence', 'bi analyst',
    'analytics engineer', 'research engineer', 'computer vision engineer',
    
    // Product & Design
    'product manager', 'product owner', 'scrum master', 'technical product manager',
    'ux designer', 'ui designer', 'product designer', 'user experience designer',
    'interaction designer', 'visual designer', 'designer', 'ux researcher',
    
    // Architecture & Leadership
    'technical architect', 'solution architect', 'software architect',
    'tech lead', 'engineering manager', 'cto', 'head of engineering'
  ]
};

// Track B: Business & Consulting
export const TRACK_B_SYNONYMS: SynonymPack = {
  track: 'B',
  synonyms: [
    // Consulting
    'consultant', 'business consultant', 'management consultant', 'strategy consultant',
    'advisory consultant', 'implementation consultant', 'process consultant',
    'change management consultant', 'digital transformation consultant',
    
    // Business Analysis
    'business analyst', 'business intelligence analyst', 'data analyst',
    'financial analyst', 'market research analyst', 'operations analyst',
    'process analyst', 'systems analyst', 'requirements analyst',
    
    // Strategy & Planning
    'strategy analyst', 'strategic planner', 'business development',
    'corporate development', 'partnership manager', 'alliance manager',
    'commercial manager', 'revenue manager', 'growth manager',
    
    // Project Management
    'project manager', 'program manager', 'portfolio manager',
    'delivery manager', 'transformation manager', 'change manager',
    'agile coach', 'scrum master', 'product owner',
    
    // Finance & Accounting
    'financial analyst', 'investment analyst', 'risk analyst',
    'credit analyst', 'treasury analyst', 'fp&a analyst',
    'audit associate', 'tax associate', 'corporate finance'
  ]
};

// Track C: Data & Analytics
export const TRACK_C_SYNONYMS: SynonymPack = {
  track: 'C',
  synonyms: [
    // Data Science
    'data scientist', 'data analyst', 'business intelligence analyst',
    'machine learning engineer', 'ml engineer', 'ai engineer', 'research scientist',
    'statistician', 'quantitative analyst', 'quant analyst',
    
    // Analytics
    'analytics engineer', 'data engineer', 'business analyst',
    'marketing analyst', 'product analyst', 'operations analyst',
    'financial analyst', 'risk analyst', 'compliance analyst',
    
    // Research
    'research analyst', 'market researcher', 'user researcher',
    'ux researcher', 'product researcher', 'business researcher',
    'competitive intelligence analyst', 'insights analyst',
    
    // Specialized Analytics
    'web analyst', 'digital analyst', 'social media analyst',
    'customer analytics', 'behavioral analyst', 'predictive analyst',
    'statistical analyst', 'econometrician', 'actuarial analyst'
  ]
};

// Track D: Marketing & Growth
export const TRACK_D_SYNONYMS: SynonymPack = {
  track: 'D',
  synonyms: [
    // Digital Marketing
    'digital marketing', 'online marketing', 'internet marketing',
    'social media marketing', 'content marketing', 'email marketing',
    'search engine marketing', 'sem', 'ppc specialist', 'paid search',
    'display advertising', 'programmatic advertising', 'affiliate marketing',
    
    // Growth & Performance
    'growth marketing', 'performance marketing', 'growth hacker',
    'growth analyst', 'conversion optimization', 'cxx specialist',
    'funnel optimization', 'user acquisition', 'retention marketing',
    
    // Brand & Content
    'brand manager', 'brand marketing', 'brand strategist',
    'content strategist', 'content creator', 'copywriter',
    'creative director', 'marketing communications', 'marcom',
    
    // Product Marketing
    'product marketing', 'product marketing manager', 'go-to-market',
    'launch manager', 'product positioning', 'competitive intelligence',
    'customer insights', 'market research', 'customer marketing',
    
    // Sales & Business Development
    'sales development', 'business development', 'partnership marketing',
    'channel marketing', 'field marketing', 'event marketing',
    'demand generation', 'lead generation', 'marketing operations'
  ]
};

// Track E: Finance & Operations
export const TRACK_E_SYNONYMS: SynonymPack = {
  track: 'E',
  synonyms: [
    // Finance
    'financial analyst', 'investment analyst', 'equity research',
    'corporate finance', 'treasury analyst', 'risk analyst',
    'credit analyst', 'fp&a analyst', 'financial planning',
    'budget analyst', 'cost analyst', 'pricing analyst',
    
    // Banking & Investment
    'investment banking', 'corporate banking', 'commercial banking',
    'private equity', 'venture capital', 'asset management',
    'portfolio management', 'wealth management', 'financial advisory',
    
    // Operations
    'operations analyst', 'business operations', 'process improvement',
    'operational excellence', 'lean six sigma', 'quality analyst',
    'supply chain analyst', 'logistics coordinator', 'procurement analyst',
    
    // Compliance & Risk
    'compliance analyst', 'regulatory analyst', 'risk management',
    'internal audit', 'external audit', 'sox compliance',
    'aml analyst', 'kyc analyst', 'fraud analyst',
    
    // Accounting
    'accounting analyst', 'cost accountant', 'management accountant',
    'financial accountant', 'tax analyst', 'audit associate',
    'bookkeeper', 'accounts payable', 'accounts receivable'
  ]
};

// City-specific synonym expansions
export const CITY_SYNONYMS: Record<string, string[]> = {
  'london': [
    'city of london', 'the city', 'canary wharf', 'westminster',
    'camden', 'islington', 'hackney', 'tower hamlets'
  ],
  'berlin': [
    'kreuzberg', 'prenzlauer berg', 'friedrichshain', 'mitte',
    'charlottenburg', 'schöneberg', 'neukölln'
  ],
  'amsterdam': [
    'zuid', 'centrum', 'oost', 'west', 'noord', 'nieuw-west',
    'amsterdam zuid', 'amsterdam centrum'
  ],
  'paris': [
    'la défense', 'champs-élysées', 'marais', 'montmartre',
    'bastille', 'opéra', 'châtelet', 'république'
  ],
  'madrid': [
    'salamanca', 'chamberí', 'centro', 'retiro', 'chueca',
    'malasaña', 'lavapiés'
  ],
  'barcelona': [
    'eixample', 'gracia', 'born', 'gothic quarter', 'poblenou',
    'sants-montjuïc', 'sarrià-sant gervasi'
  ],
  'dublin': [
    'dublin 2', 'dublin 4', 'dublin 1', 'grand canal dock',
    'silicon docks', 'ifsc', 'docklands'
  ],
  'zurich': [
    'zürich city', 'altstadt', 'kreis 1', 'kreis 2', 'kreis 4',
    'zürich west', 'seefeld'
  ],
  'stockholm': [
    'södermalm', 'östermalm', 'vasastan', 'norrmalm',
    'gamla stan', 'djurgården'
  ],
  'copenhagen': [
    'copenhagen city', 'indre by', 'vesterbro', 'nørrebro',
    'østerbro', 'frederiksberg'
  ]
};

// Multilingual synonym expansions
export const MULTILINGUAL_SYNONYMS: Record<string, string[]> = {
  // German
  'de': [
    'praktikant', 'praktikum', 'auszubildender', 'trainee',
    'berufseinsteiger', 'einsteiger', 'junger', 'jungakademiker',
    'absolvent', 'absolventin', 'neuling', 'anfänger'
  ],
  
  // French
  'fr': [
    'stagiaire', 'stage', 'apprenti', 'apprentie', 'débutant',
    'débutante', 'jeune diplômé', 'jeune diplômée', 'nouveau',
    'nouvelle', 'première expérience', 'premier emploi'
  ],
  
  // Spanish
  'es': [
    'practicante', 'practicas', 'aprendiz', 'principiante',
    'recién graduado', 'recién graduada', 'novato', 'novata',
    'primer trabajo', 'primera experiencia'
  ],
  
  // Italian
  'it': [
    'stagista', 'tirocinante', 'apprendista', 'principiante',
    'neo-laureato', 'neo-laureata', 'giovane', 'primo lavoro'
  ],
  
  // Dutch
  'nl': [
    'stagiair', 'stage', 'leerling', 'beginnende', 'starter',
    'afgestudeerde', 'nieuwe', 'eerste baan', 'junior'
  ]
};

// Combined synonym packs by track
export const TRACK_SYNONYM_PACKS: Record<string, SynonymPack> = {
  'A': TRACK_A_SYNONYMS,
  'B': TRACK_B_SYNONYMS,
  'C': TRACK_C_SYNONYMS,
  'D': TRACK_D_SYNONYMS,
  'E': TRACK_E_SYNONYMS
};

/**
 * Expand query with track-specific synonyms
 */
export function expandQueryWithTrackSynonyms(query: string, track: string): string[] {
  const trackPack = TRACK_SYNONYM_PACKS[track];
  if (!trackPack) return [query];
  
  const expandedQueries = [query];
  
  // Add track-specific synonyms
  trackPack.synonyms.forEach(synonym => {
    if (synonym.toLowerCase().includes(query.toLowerCase()) || 
        query.toLowerCase().includes(synonym.toLowerCase())) {
      expandedQueries.push(synonym);
    }
  });
  
  return expandedQueries;
}

/**
 * Expand query with city-specific synonyms
 */
export function expandQueryWithCitySynonyms(query: string, city: string): string[] {
  const citySynonyms = CITY_SYNONYMS[city.toLowerCase()];
  if (!citySynonyms) return [query];
  
  const expandedQueries = [query];
  
  // Add city-specific synonyms
  citySynonyms.forEach(synonym => {
    expandedQueries.push(`${query} ${synonym}`);
  });
  
  return expandedQueries;
}

/**
 * Expand query with multilingual synonyms
 */
export function expandQueryWithMultilingualSynonyms(query: string, language: string): string[] {
  const langSynonyms = MULTILINGUAL_SYNONYMS[language.toLowerCase()];
  if (!langSynonyms) return [query];
  
  const expandedQueries = [query];
  
  // Add multilingual synonyms
  langSynonyms.forEach(synonym => {
    expandedQueries.push(`${query} ${synonym}`);
  });
  
  return expandedQueries;
}

/**
 * Get all synonyms for a track and city combination
 */
export function getAllSynonymsForTrackAndCity(track: string, city?: string): string[] {
  const trackSynonyms = TRACK_SYNONYM_PACKS[track]?.synonyms || [];
  const citySynonyms = city ? CITY_SYNONYMS[city.toLowerCase()] || [] : [];
  
  return [...trackSynonyms, ...citySynonyms];
}

/**
 * Create enhanced query variations for a track and city
 */
export function createEnhancedQueryVariations(baseQuery: string, track: string, city?: string): string[] {
  const variations = [baseQuery];
  
  // Add track-specific variations
  const trackSynonyms = TRACK_SYNONYM_PACKS[track]?.synonyms || [];
  trackSynonyms.slice(0, 5).forEach(synonym => {
    variations.push(`${baseQuery} ${synonym}`);
  });
  
  // Add city-specific variations
  if (city) {
    const citySynonyms = CITY_SYNONYMS[city.toLowerCase()] || [];
    citySynonyms.slice(0, 3).forEach(synonym => {
      variations.push(`${baseQuery} ${synonym}`);
    });
  }
  
  return variations;
}
